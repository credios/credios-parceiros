import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";

/**
 * Tokens de uso único (convite, assinatura, reset): o valor enviado por email é
 * o token em claro; no banco guardamos apenas o SHA-256. Comparação por hash.
 */
export function generateToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Código curto público de verificação de contrato, ex.: CRD-7K2M-9XQ4. */
export function generateVerifyCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I/L
  const pick = (n: number) =>
    Array.from({ length: n }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `CRD-${pick(4)}-${pick(4)}`;
}

/** OTP numérico de 6 dígitos para assinatura de contrato. */
export function generateOtp(): { otp: string; hash: string } {
  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  return { otp, hash: hashToken(otp) };
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function sha256Hex(data: Buffer | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}
