import fs from "fs";
import path from "path";
import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";
import { sha256Hex } from "@/lib/tokens";
import { APP_URL } from "@/lib/credios";

/**
 * Renderização de contratos com pdf-lib — sem engine de HTML.
 * Parser próprio minimalista: a minuta (template-v1) usa apenas
 * <h1>, <h2> e <p> (com classes draft-notice/signature-date) e <strong>,
 * que tratamos como texto corrido (simplificação aceitável).
 */

// ---------------------------------------------------------------------------
// Layout A4
// ---------------------------------------------------------------------------

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 32;
const CONTENT_BOTTOM = MARGIN; // conteúdo não desce abaixo disso

// Cores (espelham os tokens do design system)
const INK = rgb(20 / 255, 30 / 255, 48 / 255); // credios-charcoal
const MUTED = rgb(95 / 255, 93 / 255, 88 / 255); // neutral-500
const FAINT = rgb(139 / 255, 136 / 255, 129 / 255); // neutral-400
const BLUE = rgb(75 / 255, 123 / 255, 229 / 255); // credios-blue
const BLUE_50 = rgb(238 / 255, 243 / 255, 253 / 255); // credios-blue-50
const WARNING = rgb(138 / 255, 97 / 255, 22 / 255); // status-warning
const WARNING_BG = rgb(250 / 255, 240 / 255, 215 / 255); // status-warning-bg
const LINE = rgb(214 / 255, 211 / 255, 202 / 255); // neutral-200

// ---------------------------------------------------------------------------
// Texto: entidades, WinAnsi e word wrap
// ---------------------------------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Caracteres fora do Latin-1 que o WinAnsi (cp1252) também cobre. */
const WIN_ANSI_EXTRA = new Set([
  "€", "‚", "ƒ", "„", "…", "†", "‡",
  "ˆ", "‰", "Š", "‹", "Œ", "Ž", "‘",
  "’", "“", "”", "•", "–", "—", "˜",
  "™", "š", "›", "œ", "ž", "Ÿ",
]);

/**
 * Helvetica (StandardFonts) só codifica WinAnsi: pt-BR acentuado funciona,
 * mas qualquer outro caractere lançaria exceção no encode — substituímos
 * pelo equivalente sem acento ou por "?".
 */
function sanitizeWinAnsi(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0xa0 && code <= 0xff) ||
      ch === "\n" ||
      WIN_ANSI_EXTRA.has(ch)
    ) {
      out += ch === " " ? " " : ch;
      continue;
    }
    const stripped = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const sc = stripped.codePointAt(0);
    if (
      stripped.length > 0 &&
      sc !== undefined &&
      ((sc >= 0x20 && sc <= 0x7e) || (sc >= 0xa0 && sc <= 0xff))
    ) {
      out += stripped;
    } else {
      out += "?";
    }
  }
  return out;
}

/** Quebra por palavra medindo com widthOfTextAtSize; palavras gigantes quebram no caractere. */
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(" ").filter((w) => w.length > 0);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      let chunk = "";
      for (const ch of word) {
        if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

// ---------------------------------------------------------------------------
// Parser minimalista da minuta
// ---------------------------------------------------------------------------

type BlockKind = "h1" | "h2" | "p" | "notice";
interface Block {
  kind: BlockKind;
  text: string;
}

function htmlToPlainText(inner: string): string {
  return sanitizeWinAnsi(
    decodeEntities(inner.replace(/<[^>]+>/g, ""))
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** Parseia o HTML da minuta em blocos h1/h2/p/notice; ignora o resto. */
function parseBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  const re = /<(h1|h2|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toLowerCase() as "h1" | "h2" | "p";
    const text = htmlToPlainText(m[3]);
    if (!text) continue;
    const kind: BlockKind =
      tag === "p" && /draft-notice/i.test(m[2]) ? "notice" : tag;
    blocks.push({ kind, text });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Cursor de escrita com quebra de página automática
// ---------------------------------------------------------------------------

interface Writer {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
}

function newPage(w: Writer): void {
  w.page = w.doc.addPage([PAGE_W, PAGE_H]);
  w.y = PAGE_H - MARGIN;
}

/** Garante espaço vertical; senão abre página nova. */
function ensure(w: Writer, height: number): void {
  if (w.y - height < CONTENT_BOTTOM) newPage(w);
}

function drawParagraph(
  w: Writer,
  text: string,
  opts: {
    font: PDFFont;
    size: number;
    lineHeight: number;
    color?: RGB;
    spacingBefore?: number;
    spacingAfter?: number;
    x?: number;
    maxWidth?: number;
  }
): void {
  const {
    font,
    size,
    lineHeight,
    color = INK,
    spacingBefore = 0,
    spacingAfter = 0,
    x = MARGIN,
    maxWidth = CONTENT_W,
  } = opts;
  const lines = wrapText(text, font, size, maxWidth);
  if (w.y - spacingBefore - lineHeight >= CONTENT_BOTTOM) w.y -= spacingBefore;
  for (const line of lines) {
    ensure(w, lineHeight);
    w.y -= lineHeight;
    w.page.drawText(line, { x, y: w.y, size, font, color });
  }
  w.y -= spacingAfter;
}

// ---------------------------------------------------------------------------
// renderContractPdf
// ---------------------------------------------------------------------------

/**
 * Renderiza a minuta mesclada em PDF A4. O verifyCode (opcional) é impresso
 * pequeno no rodapé de todas as páginas, ao lado da numeração.
 */
export async function renderContractPdf(
  mergedHtml: string,
  opts?: { verifyCode?: string }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Contrato de parceria — Credios");
  doc.setProducer("Assinador Credios");

  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const w: Writer = { doc, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN };

  // Logo da Credios no topo da 1ª página (falha silenciosa se ausente)
  try {
    const logoBytes = fs.readFileSync(
      path.join(process.cwd(), "public", "credios-logo.png")
    );
    const logo = await doc.embedPng(logoBytes);
    const logoH = 24;
    const logoW = (logo.width / logo.height) * logoH;
    w.y -= logoH;
    w.page.drawImage(logo, { x: MARGIN, y: w.y, width: logoW, height: logoH });
    w.y -= 28;
  } catch {
    // sem logo — segue sem quebrar a geração
  }

  for (const block of parseBlocks(mergedHtml)) {
    switch (block.kind) {
      case "h1":
        drawParagraph(w, block.text, {
          font: helvBold,
          size: 16,
          lineHeight: 21,
          spacingAfter: 14,
        });
        break;
      case "h2":
        drawParagraph(w, block.text, {
          font: helvBold,
          size: 12,
          lineHeight: 16,
          spacingBefore: 10,
          spacingAfter: 6,
        });
        break;
      case "notice": {
        // Caixa de aviso com fundo claro e texto em destaque
        const size = 10;
        const pad = 12;
        const lineHeight = 14;
        const lines = wrapText(block.text, helvBold, size, CONTENT_W - pad * 2);
        const boxH = lines.length * lineHeight + pad * 2 - 4;
        ensure(w, boxH + 8);
        w.page.drawRectangle({
          x: MARGIN,
          y: w.y - boxH,
          width: CONTENT_W,
          height: boxH,
          color: WARNING_BG,
          borderColor: WARNING,
          borderWidth: 0.75,
        });
        let ty = w.y - pad;
        for (const line of lines) {
          ty -= lineHeight - 4;
          const lw = helvBold.widthOfTextAtSize(line, size);
          w.page.drawText(line, {
            x: MARGIN + (CONTENT_W - lw) / 2,
            y: ty,
            size,
            font: helvBold,
            color: WARNING,
          });
          ty -= 4;
        }
        w.y -= boxH + 12;
        break;
      }
      default:
        drawParagraph(w, block.text, {
          font: helv,
          size: 10.5,
          lineHeight: 16,
          spacingAfter: 8,
        });
    }
  }

  drawFooters(doc, helv, opts?.verifyCode);
  return doc.save();
}

/** Rodapé "Página X de Y" + código de verificação em todas as páginas. */
function drawFooters(doc: PDFDocument, font: PDFFont, verifyCode?: string): void {
  const pages = doc.getPages();
  const total = pages.length;
  pages.forEach((page, i) => {
    const label = `Página ${i + 1} de ${total}`;
    const lw = font.widthOfTextAtSize(label, 8);
    page.drawText(label, {
      x: PAGE_W - MARGIN - lw,
      y: FOOTER_Y,
      size: 8,
      font,
      color: FAINT,
    });
    if (verifyCode) {
      page.drawText(sanitizeWinAnsi(`Verificação: ${verifyCode}`), {
        x: MARGIN,
        y: FOOTER_Y,
        size: 8,
        font,
        color: FAINT,
      });
    }
  });
}

// ---------------------------------------------------------------------------
// buildSignedPdf
// ---------------------------------------------------------------------------

const EVENT_LABELS: Record<string, string> = {
  GENERATED: "Documento gerado",
  SENT: "Link de assinatura enviado",
  LINK_OPENED: "Link aberto",
  OTP_SENT: "Código OTP enviado",
  OTP_VERIFIED: "Identidade verificada (OTP)",
  SIGNED: "Assinado pelo parceiro",
  ADMIN_SIGN_REQUESTED: "Enviado para assinatura da Credios",
  ADMIN_SIGNED: "Assinado pela Credios (contratada)",
  DOWNLOADED: "Documento baixado",
};

function formatUtc(d: Date): string {
  return `${d.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

function formatBrasilia(d: Date): string {
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const LEGAL_NOTE =
  "A assinatura eletrônica realizada nesta plataforma constitui assinatura " +
  "eletrônica nos termos do art. 10, §2º, da MP 2.200-2/2001 e da Lei " +
  "14.063/2020, sendo válida e eficaz entre as partes, que expressamente a " +
  "aceitam como meio de comprovação de autoria e integridade.";

export interface PdfSigner {
  /** Papel exibido no carimbo (ex.: "PARCEIRO", "CREDIOS (CONTRATADA)"). */
  role: string;
  name: string;
  document: string;
  email: string;
  signedAt: Date;
  /** Como a identidade foi verificada — impresso no manifesto. */
  verification: string;
}

export interface SignedPdfOptions {
  unsignedPdf: Uint8Array;
  signers: PdfSigner[];
  events: {
    event: string;
    createdAt: Date;
    ip?: string | null;
    userAgent?: string | null;
  }[];
  verifyCode: string;
}

/**
 * Carrega o PDF original, carimba as assinaturas (uma caixa por signatário,
 * lado a lado) na última página do documento original e anexa a página de
 * manifesto de auditoria. Retorna o PDF final e seu hash SHA-256 (o hash do
 * documento ORIGINAL é impresso no manifesto).
 */
export async function buildSignedPdf(
  opts: SignedPdfOptions
): Promise<{ pdf: Uint8Array; hash: string }> {
  const originalHash = sha256Hex(opts.unsignedPdf);
  const doc = await PDFDocument.load(opts.unsignedPdf);
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const courier = await doc.embedFont(StandardFonts.Courier);

  // --- Carimbos de assinatura na última página do documento original ------
  const lastPage = doc.getPage(doc.getPageCount() - 1);
  const stampH = 92;
  const stampY = FOOTER_Y + 16;
  const gap = 10;
  const n = Math.max(opts.signers.length, 1);
  const boxW = (CONTENT_W - gap * (n - 1)) / n;

  opts.signers.forEach((signer, i) => {
    const x = MARGIN + i * (boxW + gap);
    lastPage.drawRectangle({
      x,
      y: stampY,
      width: boxW,
      height: stampH,
      color: BLUE_50,
      borderColor: BLUE,
      borderWidth: 1,
    });
    const stampLines: { text: string; font: PDFFont; size: number }[] = [
      { text: sanitizeWinAnsi(signer.role), font: helvBold, size: 7.5 },
      {
        text: sanitizeWinAnsi(`Assinado eletronicamente por ${signer.name}`),
        font: helvBold,
        size: 9,
      },
      { text: sanitizeWinAnsi(`CPF/CNPJ ${signer.document}`), font: helv, size: 8 },
      { text: sanitizeWinAnsi(signer.email), font: helv, size: 8 },
      {
        text: sanitizeWinAnsi(`${formatBrasilia(signer.signedAt)} (Brasília)`),
        font: helv,
        size: 8,
      },
    ];
    let sy = stampY + stampH - 16;
    for (const line of stampLines) {
      const wrapped = wrapText(line.text, line.font, line.size, boxW - 24);
      for (const text of wrapped) {
        lastPage.drawText(text, {
          x: x + 12,
          y: sy,
          size: line.size,
          font: line.font,
          color: line.font === helvBold ? INK : MUTED,
        });
        sy -= line.size + 4.5;
      }
    }
  });
  // (o código de verificação já aparece no rodapé de todas as páginas)

  // --- Página(s) de manifesto de auditoria --------------------------------
  const w: Writer = { doc, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN };

  drawParagraph(w, sanitizeWinAnsi("Manifesto de assinatura — Assinador Credios"), {
    font: helvBold,
    size: 14,
    lineHeight: 18,
    spacingAfter: 4,
  });
  drawParagraph(
    w,
    sanitizeWinAnsi(
      "Registro de auditoria gerado automaticamente no momento da assinatura."
    ),
    { font: helv, size: 9, lineHeight: 13, color: FAINT, spacingAfter: 14 }
  );

  const section = (title: string) =>
    drawParagraph(w, sanitizeWinAnsi(title), {
      font: helvBold,
      size: 11,
      lineHeight: 15,
      spacingBefore: 8,
      spacingAfter: 4,
    });
  const field = (label: string, value: string) =>
    drawParagraph(w, sanitizeWinAnsi(`${label}: ${value}`), {
      font: helv,
      size: 9.5,
      lineHeight: 14,
      color: MUTED,
      spacingAfter: 1,
    });

  section(opts.signers.length > 1 ? "Signatários" : "Signatário");
  opts.signers.forEach((signer, i) => {
    if (i > 0) w.y -= 6;
    field("Papel", signer.role);
    field("Nome", signer.name);
    field("CPF/CNPJ", signer.document);
    field("Email", signer.email);
    field("Verificação de identidade", signer.verification);
    field("Assinado em", `${formatBrasilia(signer.signedAt)} (Brasília)`);
  });

  section("Integridade do documento");
  drawParagraph(
    w,
    sanitizeWinAnsi("Hash SHA-256 do documento original (antes da assinatura):"),
    { font: helv, size: 9.5, lineHeight: 14, color: MUTED }
  );
  drawParagraph(w, originalHash, {
    font: courier,
    size: 8.5,
    lineHeight: 12,
    spacingAfter: 4,
  });
  field("Código de verificação", opts.verifyCode);
  field("Verificação pública", `${APP_URL}/verificar/${opts.verifyCode}`);

  section("Trilha de auditoria");
  drawEventsTable(w, helv, helvBold, opts.events);

  // Nota jurídica no rodapé do manifesto
  const noteLines = wrapText(sanitizeWinAnsi(LEGAL_NOTE), helv, 7.5, CONTENT_W);
  const noteH = noteLines.length * 10 + 12;
  if (w.y < CONTENT_BOTTOM + noteH) newPage(w);
  let ny = FOOTER_Y + 12 + noteLines.length * 10;
  w.page.drawLine({
    start: { x: MARGIN, y: ny + 8 },
    end: { x: PAGE_W - MARGIN, y: ny + 8 },
    thickness: 0.5,
    color: LINE,
  });
  for (const line of noteLines) {
    ny -= 10;
    w.page.drawText(line, { x: MARGIN, y: ny, size: 7.5, font: helv, color: FAINT });
  }

  const pdf = await doc.save();
  return { pdf, hash: sha256Hex(pdf) };
}

/** Tabela de eventos do manifesto: evento, UTC, Brasília, IP, dispositivo. */
function drawEventsTable(
  w: Writer,
  helv: PDFFont,
  helvBold: PDFFont,
  events: SignedPdfOptions["events"]
): void {
  const size = 7.5;
  const lineHeight = 10;
  const cols = [
    { label: "Evento", x: MARGIN, width: 86 },
    { label: "Data/hora (UTC)", x: MARGIN + 90, width: 92 },
    { label: "Data/hora (Brasília)", x: MARGIN + 186, width: 92 },
    { label: "IP", x: MARGIN + 282, width: 66 },
    { label: "Dispositivo", x: MARGIN + 352, width: CONTENT_W - 352 },
  ];

  const drawHeader = () => {
    ensure(w, lineHeight + 6);
    w.y -= lineHeight;
    for (const col of cols) {
      w.page.drawText(sanitizeWinAnsi(col.label), {
        x: col.x,
        y: w.y,
        size,
        font: helvBold,
        color: INK,
      });
    }
    w.y -= 4;
    w.page.drawLine({
      start: { x: MARGIN, y: w.y },
      end: { x: PAGE_W - MARGIN, y: w.y },
      thickness: 0.5,
      color: LINE,
    });
    w.y -= 4;
  };

  drawHeader();

  for (const ev of events) {
    const ua = ev.userAgent
      ? ev.userAgent.length > 110
        ? `${ev.userAgent.slice(0, 110)}…`
        : ev.userAgent
      : "—";
    const cells = [
      EVENT_LABELS[ev.event] ?? ev.event,
      formatUtc(ev.createdAt),
      formatBrasilia(ev.createdAt),
      ev.ip || "—",
      ua,
    ].map((c, i) => wrapText(sanitizeWinAnsi(c), helv, size, cols[i].width));
    const rowLines = Math.max(...cells.map((c) => c.length));
    const rowH = rowLines * lineHeight + 4;

    if (w.y - rowH < CONTENT_BOTTOM) {
      newPage(w);
      drawHeader();
    }
    for (let li = 0; li < rowLines; li++) {
      w.y -= lineHeight;
      cells.forEach((cellLines, ci) => {
        const text = cellLines[li];
        if (!text) return;
        w.page.drawText(text, {
          x: cols[ci].x,
          y: w.y,
          size,
          font: helv,
          color: MUTED,
        });
      });
    }
    w.y -= 4;
  }
}
