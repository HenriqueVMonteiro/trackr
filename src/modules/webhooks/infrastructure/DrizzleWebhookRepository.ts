import { eq } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { webhookEndpoints } from "@/infrastructure/db/schema";
import { WebhookEndpoint, RetryPolicy, type SignatureAlgo } from "../domain";
import type { WebhookRepository } from "../application/ports/WebhookRepository";

// SOLID: DIP — concretiza a port WebhookRepository sobre Drizzle.
export class DrizzleWebhookRepository implements WebhookRepository {
  constructor(private readonly db: Database) {}

  async save(endpoint: WebhookEndpoint): Promise<void> {
    const j = endpoint.toJSON();
    const { type, params } = RetryPolicy.toPersistence(j.retryPolicy);
    await this.db
      .insert(webhookEndpoints)
      .values({
        id: j.id,
        workspaceId: j.workspaceId,
        url: j.url,
        secret: j.secret,
        retryPolicyType: type,
        retryPolicyParams: params,
        signatureAlgo: j.signatureAlgo,
        active: j.active,
        createdAt: j.createdAt,
      })
      .onConflictDoUpdate({
        target: webhookEndpoints.id,
        set: {
          url: j.url,
          secret: j.secret,
          retryPolicyType: type,
          retryPolicyParams: params,
          signatureAlgo: j.signatureAlgo,
          active: j.active,
        },
      });
  }

  async findById(id: string): Promise<WebhookEndpoint | null> {
    const row = await this.db.query.webhookEndpoints.findFirst({
      where: eq(webhookEndpoints.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async listByWorkspace(workspaceId: string): Promise<WebhookEndpoint[]> {
    const rows = await this.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.workspaceId, workspaceId));
    return rows.map((r) => this.toEntity(r));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id));
  }

  private toEntity(row: typeof webhookEndpoints.$inferSelect): WebhookEndpoint {
    // throw (não Result) aqui é correto: linha inválida no banco é invariante
    // quebrado / bug, não erro de negócio previsível (HANDOFF §3.1).
    const policy = RetryPolicy.fromPersistence(row.retryPolicyType, row.retryPolicyParams);
    if (!policy.ok) {
      throw new Error(`Corrupt retry policy for endpoint ${row.id}: ${policy.error.message}`);
    }
    return WebhookEndpoint.fromPersistence({
      id: row.id,
      workspaceId: row.workspaceId,
      url: row.url,
      secret: row.secret,
      retryPolicy: policy.value,
      signatureAlgo: toSignatureAlgo(row.signatureAlgo),
      active: row.active,
      createdAt: row.createdAt,
    });
  }
}

// Type guard explícito em vez de cast (HANDOFF §3.1: sem `as unknown as`).
function toSignatureAlgo(value: string): SignatureAlgo {
  if (value === "hmac-sha256" || value === "hmac-sha1" || value === "ed25519") {
    return value;
  }
  throw new Error(`Unknown signature algorithm in DB: ${value}`);
}
