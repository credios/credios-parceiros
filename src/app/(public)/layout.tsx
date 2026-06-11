import Image from "next/image";
import Link from "next/link";
import { CREDIOS } from "@/lib/credios";

/** Layout das páginas públicas: header leve + footer institucional. */
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/credios-logo.png"
              alt="Credios"
              width={120}
              height={32}
              className="h-8 w-auto"
              priority
            />
            <span className="t-eyebrow text-neutral-400 hidden sm:inline mt-1">
              Parceiros
            </span>
          </Link>
          <Link
            href="/entrar"
            className="text-sm font-semibold text-credios-blue hover:text-credios-blue-700 transition-colors duration-150 px-3 py-2"
          >
            Entrar
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col gap-2">
          <p className="t-caption text-neutral-500">
            {CREDIOS.razaoSocial} · CNPJ {CREDIOS.cnpj}
          </p>
          <p className="t-caption text-neutral-400">
            {CREDIOS.endereco} · {CREDIOS.regulacao}
          </p>
          <div className="flex gap-4 mt-1">
            <Link href="/termos" className="t-caption text-credios-blue hover:underline">
              Termos de uso
            </Link>
            <Link
              href="/privacidade"
              className="t-caption text-credios-blue hover:underline"
            >
              Política de privacidade
            </Link>
            <a
              href={CREDIOS.site}
              className="t-caption text-credios-blue hover:underline"
            >
              credios.com.br
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
