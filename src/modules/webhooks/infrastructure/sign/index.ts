import type { SignatureAlgo } from "../../domain";
import type { WebhookSigner } from "./WebhookSigner";
import { HmacSha256Signer } from "./HmacSha256Signer";
import { HmacSha1Signer } from "./HmacSha1Signer";
import { Ed25519Signer } from "./Ed25519Signer";

export type { WebhookSigner } from "./WebhookSigner";
export { HmacSha256Signer } from "./HmacSha256Signer";
export { HmacSha1Signer } from "./HmacSha1Signer";
export { Ed25519Signer } from "./Ed25519Signer";

// SOLID: LSP/OCP — seleciona o signer pelo algoritmo do endpoint. Exaustivo sobre
// SignatureAlgo; um algoritmo novo é um case + uma classe, sem mudar callers.
export function signerFor(algo: SignatureAlgo): WebhookSigner {
  switch (algo) {
    case "hmac-sha256":
      return new HmacSha256Signer();
    case "hmac-sha1":
      return new HmacSha1Signer();
    case "ed25519":
      return new Ed25519Signer();
  }
}
