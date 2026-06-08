import { createHmac } from "node:crypto";
import type { WebhookSigner } from "./WebhookSigner";

// SOLID: LSP — implementação padrão; substituível por qualquer outro WebhookSigner.
export class HmacSha256Signer implements WebhookSigner {
  readonly algo = "hmac-sha256";

  sign(payload: string, secret: string): string {
    return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  }
}
