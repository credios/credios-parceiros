"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/** Normaliza o código digitado: maiúsculas, sem espaços/caracteres soltos. */
function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function VerifyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const normalized = normalizeCode(code);
        if (normalized) router.push(`/verificar/${encodeURIComponent(normalized)}`);
      }}
    >
      <Field
        label="Código de verificação"
        htmlFor="codigo"
        hint="O código está impresso no rodapé do PDF e no manifesto de assinatura."
      >
        <Input
          id="codigo"
          name="codigo"
          placeholder="CRD-XXXX-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          className="font-mono tracking-widest"
        />
      </Field>
      <Button type="submit" className="w-full sm:w-fit">
        <Search size={16} aria-hidden />
        Verificar documento
      </Button>
    </form>
  );
}
