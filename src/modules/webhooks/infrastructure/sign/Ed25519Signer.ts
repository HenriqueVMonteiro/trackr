import { createPrivateKey, sign as cryptoSign } from "node:crypto";
import type { WebhookSigner } from "./WebhookSigner";

// SOLID: LSP — substituível pelos signers HMAC. Aqui o "secret" do endpoint é uma
// chave privada Ed25519 em PEM (formato pkcs8). A assinatura é base64.
export class Ed25519Signer implements WebhookSigner {
  readonly algo = "ed25519";

  sign(payload: string, secret: string): string {
    const key = createPrivateKey(secret);
    // Ed25519 não usa hash externo — algoritmo nulo, chave Ed25519.
    const signature = cryptoSign(null, Buffer.from(payload, "utf8"), key);
    return `ed25519=${signature.toString("base64")}`;
  }
}
