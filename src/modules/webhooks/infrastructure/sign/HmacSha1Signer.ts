import { createHmac } from "node:crypto";
import type { WebhookSigner } from "./WebhookSigner";

// SOLID: LSP — mesmo contrato do HmacSha256Signer, algoritmo diferente.
export class HmacSha1Signer implements WebhookSigner {
  readonly algo = "hmac-sha1";

  sign(payload: string, secret: string): string {
    return `sha1=${createHmac("sha1", secret).update(payload).digest("hex")}`;
  }
}
