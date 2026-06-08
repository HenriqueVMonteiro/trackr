// SOLID: LSP — qualquer WebhookSigner é substituível: o worker assina o payload
// sem saber qual algoritmo está por trás. Trocar HMAC-SHA256 por HMAC-SHA1 ou
// Ed25519 não muda o código que chama sign().
export interface WebhookSigner {
  readonly algo: string;
  // Assina o payload (corpo serializado) com o segredo/chave do endpoint e
  // devolve a assinatura codificada (o header X-Trackr-Signature do B3 worker).
  sign(payload: string, secret: string): string;
}
