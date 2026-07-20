/**
 * Regras de pré-qualificação aplicadas ao cadastro de indicação (CGI).
 * Rodar: npx tsx src/lib/__tests__/qualificacao.test.ts
 *
 * Sem framework de teste no projeto — script assertivo puro, que sai com
 * código 1 no primeiro erro.
 */
import assert from "node:assert/strict";
import { leadSchema } from "@/lib/validators";
import {
  MIN_CREDIT,
  MIN_PROPERTY,
  ltvOf,
  rendaQualifica,
  saldoDesqualifica,
  liquidoInviavel,
} from "@/lib/qualificacao";

/** Indicação válida de referência — cada teste altera só o que importa. */
const base = {
  name: "Cliente de Teste",
  document: "04233726962",
  phone: "45991079996",
  email: "",
  city: "Toledo",
  state: "PR",
  product: "CGI",
  propertyType: "Apartamento",
  propertyValue: "500.000",
  requestedAmount: "250.000",
  rendaTitular: "8.000",
  rendaConjuge: "",
  saldoDevedor: "0",
  propertyCity: "Toledo",
  notes: "",
  consent: true,
};

function parse(over: Record<string, unknown> = {}) {
  return leadSchema.safeParse({ ...base, ...over });
}

/** Erros por campo, para asserir a mensagem no lugar certo. */
function errs(r: ReturnType<typeof parse>): Record<string, string[]> {
  if (r.success) return {};
  const out: Record<string, string[]> = {};
  for (const i of r.error.issues) {
    const k = String(i.path[0] ?? "_");
    (out[k] ??= []).push(i.message);
  }
  return out;
}

let n = 0;
function test(label: string, fn: () => void) {
  fn();
  n++;
  console.log(`  ok  ${label}`);
}

console.log("\nPré-qualificação de indicações (CGI)\n");

test("indicação dentro da política passa", () => {
  assert.equal(parse().success, true);
});

// ── O caso que motivou a correção ────────────────────────────────────────
test("REGRESSÃO: imóvel 200k + crédito 250k (LTV 125%) é recusado", () => {
  const r = parse({ propertyValue: "200.000", requestedAmount: "250.000" });
  assert.equal(r.success, false);
  const e = errs(r);
  assert.ok(e.propertyValue?.some((m) => m.includes("mínimo")), "deve barrar o piso do imóvel");
  assert.ok(e.requestedAmount?.some((m) => m.includes("%")), "deve barrar o LTV");
});

// ── Imóvel ───────────────────────────────────────────────────────────────
test(`imóvel abaixo de ${MIN_PROPERTY} é recusado`, () => {
  assert.equal(parse({ propertyValue: "299.000", requestedAmount: "100.000" }).success, false);
});

test("imóvel exatamente no piso passa", () => {
  assert.equal(parse({ propertyValue: "300.000", requestedAmount: "180.000" }).success, true);
});

test("imóvel acima do teto de 20 mi é recusado", () => {
  const r = parse({ propertyValue: "20.000.001", requestedAmount: "1.000.000" });
  assert.ok(errs(r).propertyValue?.some((m) => m.includes("caso a caso")));
});

// ── Crédito ──────────────────────────────────────────────────────────────
test(`crédito abaixo de ${MIN_CREDIT} é recusado`, () => {
  const r = parse({ requestedAmount: "50.000" });
  assert.ok(errs(r).requestedAmount?.some((m) => m.includes("mínimo")));
});

// ── LTV por tipo ─────────────────────────────────────────────────────────
test("apartamento aceita 60% e recusa acima", () => {
  assert.equal(ltvOf("Apartamento"), 0.6);
  assert.equal(parse({ propertyValue: "500.000", requestedAmount: "300.000" }).success, true);
  assert.equal(parse({ propertyValue: "500.000", requestedAmount: "300.001" }).success, false);
});

test("casa de rua limita a 50%, não a 60%", () => {
  assert.equal(ltvOf("Casa de rua"), 0.5);
  const r = parse({ propertyType: "Casa de rua", propertyValue: "500.000", requestedAmount: "270.000" });
  assert.equal(r.success, false, "270k em casa de rua (54%) tem que ser recusado");
  assert.equal(
    parse({ propertyType: "Casa de rua", propertyValue: "500.000", requestedAmount: "250.000" }).success,
    true
  );
});

test("terreno limita a 40%", () => {
  assert.equal(ltvOf("Terreno"), 0.4);
  assert.equal(
    parse({ propertyType: "Terreno", propertyValue: "500.000", requestedAmount: "220.000" }).success,
    false
  );
  assert.equal(
    parse({ propertyType: "Terreno", propertyValue: "500.000", requestedAmount: "200.000" }).success,
    true
  );
});

test("imóvel rural é sempre recusado", () => {
  const r = parse({ propertyType: "Imóvel rural", propertyValue: "5.000.000", requestedAmount: "100.000" });
  assert.equal(r.success, false);
  assert.ok(errs(r).propertyType?.some((m) => m.includes("rural")));
});

// ── Renda ────────────────────────────────────────────────────────────────
test("renda do titular de 5k passa sozinha", () => {
  assert.equal(rendaQualifica(5000), true);
  assert.equal(parse({ rendaTitular: "5.000" }).success, true);
});

test("titular abaixo de 5k sem cônjuge é recusado", () => {
  assert.equal(rendaQualifica(4000), false);
  const r = parse({ rendaTitular: "4.000" });
  assert.ok(errs(r).rendaTitular?.some((m) => m.includes("Renda abaixo")));
});

test("titular 4k + cônjuge 4k soma 8k e passa", () => {
  assert.equal(rendaQualifica(4000, 4000), true);
  assert.equal(parse({ rendaTitular: "4.000", rendaConjuge: "4.000" }).success, true);
});

test("titular 4k + cônjuge 3k soma 7k e é recusado", () => {
  assert.equal(rendaQualifica(4000, 3000), false);
  assert.equal(parse({ rendaTitular: "4.000", rendaConjuge: "3.000" }).success, false);
});

// ── Saldo devedor ────────────────────────────────────────────────────────
test("saldo devedor ≥ 50% do imóvel é recusado", () => {
  assert.equal(saldoDesqualifica(250_000, 500_000), true);
  const r = parse({ saldoDevedor: "250.000" });
  assert.ok(errs(r).saldoDevedor?.some((m) => m.includes("50%")));
});

test("saldo devedor que zera o líquido viável é recusado", () => {
  // Apto 500k, LTV 60% = teto 300k. Saldo 240k → sobram 60k < 75k mínimo.
  assert.equal(liquidoInviavel(500_000, 0.6, 240_000), true);
  const r = parse({ saldoDevedor: "240.000", requestedAmount: "80.000" });
  assert.ok(errs(r).saldoDevedor?.some((m) => m.includes("líquidos")));
});

test("saldo devedor saudável passa", () => {
  assert.equal(parse({ saldoDevedor: "100.000", requestedAmount: "150.000" }).success, true);
});

// ── Escopo por produto ───────────────────────────────────────────────────
test("financiamento NÃO passa pelas regras de CGI", () => {
  const r = parse({
    product: "FINANCIAMENTO",
    propertyValue: "200.000",
    requestedAmount: "250.000",
    propertyType: "",
    rendaTitular: "",
    saldoDevedor: "",
  });
  assert.equal(r.success, true, "financiamento tem lógica de garantia própria");
});

test("condomínio NÃO passa pelas regras de CGI", () => {
  const r = parse({
    product: "CONDOMINIO",
    propertyValue: "",
    requestedAmount: "100.000",
    propertyType: "",
    rendaTitular: "",
    saldoDevedor: "",
  });
  assert.equal(r.success, true);
});

// ── Campos obrigatórios ──────────────────────────────────────────────────
test("CGI sem tipo de imóvel, renda ou saldo é recusado", () => {
  const r = parse({ propertyType: "", rendaTitular: "", saldoDevedor: "" });
  const e = errs(r);
  assert.ok(e.propertyType, "tipo de imóvel obrigatório");
  assert.ok(e.rendaTitular, "renda obrigatória");
  assert.ok(e.saldoDevedor, "saldo devedor obrigatório");
});

test("todos os motivos vêm de uma vez, não um por envio", () => {
  const r = parse({ propertyValue: "100.000", requestedAmount: "50.000", rendaTitular: "1.000" });
  const e = errs(r);
  assert.ok(Object.keys(e).length >= 3, `esperava ≥3 campos com erro, veio ${Object.keys(e).length}`);
});

console.log(`\n${n} testes passaram\n`);
