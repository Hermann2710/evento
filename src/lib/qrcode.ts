import QRCode from "qrcode";
import { hmacSha256, safeEqual } from "@/lib/tokens";
import { secret } from "@/lib/site";

/** QR payload = ticketNumber + truncated HMAC so tickets cannot be forged. */
export function ticketPayload(ticketNumber: string): string {
  return `${ticketNumber}.${hmacSha256(secret("AUTH_SECRET"), ticketNumber).slice(0, 20)}`;
}

export function verifyTicketPayload(payload: string): string | null {
  const [ticketNumber, sig] = payload.split(".");
  if (!ticketNumber || !sig) return null;
  return safeEqual(sig, hmacSha256(secret("AUTH_SECRET"), ticketNumber).slice(0, 20)) ? ticketNumber : null;
}

export function createTicketQr(ticketNumber: string): Promise<string> {
  return QRCode.toDataURL(ticketPayload(ticketNumber), { margin: 1, width: 320, errorCorrectionLevel: "M" });
}
