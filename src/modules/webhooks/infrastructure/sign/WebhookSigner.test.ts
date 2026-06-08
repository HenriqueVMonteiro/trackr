import { describe, it, expect } from "vitest";
import { generateKeyPairSync, verify as cryptoVerify } from "node:crypto";

import {
  signerFor,
  HmacSha256Signer,
  HmacSha1Signer,
  Ed25519Signer,
} from "./index";

describe("WebhookSigner (LSP)", () => {
  const payload = JSON.stringify({ event: "issue.created", id: "iss_1" });

  it("HmacSha256Signer is deterministic and prefixed", () => {
    const s = new HmacSha256Signer();
    const a = s.sign(payload, "a-very-long-secret-value");
    const b = s.sign(payload, "a-very-long-secret-value");
    expect(a).toBe(b);
    expect(a.startsWith("sha256=")).toBe(true);
    expect(s.sign(payload, "other-secret-key-123")).not.toBe(a);
  });

  it("HmacSha1Signer produces a sha1-prefixed signature", () => {
    const sig = new HmacSha1Signer().sign(payload, "a-very-long-secret-value");
    expect(sig.startsWith("sha1=")).toBe(true);
  });

  it("Ed25519Signer produces a verifiable signature", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const sig = new Ed25519Signer().sign(payload, pem);
    expect(sig.startsWith("ed25519=")).toBe(true);
    const raw = Buffer.from(sig.replace("ed25519=", ""), "base64");
    expect(cryptoVerify(null, Buffer.from(payload, "utf8"), publicKey, raw)).toBe(true);
  });

  it("signerFor selects the signer matching the algorithm", () => {
    expect(signerFor("hmac-sha256").algo).toBe("hmac-sha256");
    expect(signerFor("hmac-sha1").algo).toBe("hmac-sha1");
    expect(signerFor("ed25519").algo).toBe("ed25519");
  });
});
