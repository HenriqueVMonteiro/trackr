import { ok, err, type Result } from "@/shared/result";
import { ValidationError } from "@/shared/errors";
import { RetryPolicy } from "./RetryPolicy";

// SOLID: SRP — WebhookEndpoint conhece só suas invariantes (url https, secret
// forte, política de retry). Entidade imutável; operações retornam nova instância.

export type SignatureAlgo = "hmac-sha256" | "hmac-sha1" | "ed25519";

const KNOWN_ALGOS: readonly SignatureAlgo[] = ["hmac-sha256", "hmac-sha1", "ed25519"];
const SECRET_MIN_LENGTH = 16;

export interface WebhookEndpointProps {
  readonly id: string;
  readonly workspaceId: string;
  readonly url: string;
  readonly secret: string;
  readonly retryPolicy: RetryPolicy;
  readonly signatureAlgo: SignatureAlgo;
  readonly active: boolean;
  readonly createdAt: Date;
}

export interface CreateWebhookEndpointInput {
  readonly id: string;
  readonly workspaceId: string;
  readonly url: string;
  readonly secret: string;
  readonly retryPolicy?: RetryPolicy;
  readonly signatureAlgo?: SignatureAlgo;
  readonly active?: boolean;
  readonly createdAt: Date;
}

export class WebhookEndpoint {
  private constructor(private readonly props: WebhookEndpointProps) {
    Object.freeze(this);
  }

  static create(input: CreateWebhookEndpointInput): Result<WebhookEndpoint, ValidationError> {
    const url = input.url.trim();
    if (!WebhookEndpoint.isHttpsUrl(url)) {
      return err(new ValidationError("Webhook URL must be a valid https:// URL", { field: "url" }));
    }
    if (input.secret.length < SECRET_MIN_LENGTH) {
      return err(
        new ValidationError(`Secret must be at least ${SECRET_MIN_LENGTH} characters`, {
          field: "secret",
        }),
      );
    }
    const signatureAlgo = input.signatureAlgo ?? "hmac-sha256";
    if (!KNOWN_ALGOS.includes(signatureAlgo)) {
      return err(
        new ValidationError(`Unknown signature algorithm '${signatureAlgo}'`, {
          field: "signatureAlgo",
        }),
      );
    }
    return ok(
      new WebhookEndpoint({
        id: input.id,
        workspaceId: input.workspaceId,
        url,
        secret: input.secret,
        retryPolicy: input.retryPolicy ?? RetryPolicy.exponential(),
        signatureAlgo,
        active: input.active ?? true,
        createdAt: input.createdAt,
      }),
    );
  }

  static fromPersistence(props: WebhookEndpointProps): WebhookEndpoint {
    return new WebhookEndpoint(props);
  }

  private static isHttpsUrl(value: string): boolean {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }

  get id(): string {
    return this.props.id;
  }
  get workspaceId(): string {
    return this.props.workspaceId;
  }
  get url(): string {
    return this.props.url;
  }
  get secret(): string {
    return this.props.secret;
  }
  get retryPolicy(): RetryPolicy {
    return this.props.retryPolicy;
  }
  get signatureAlgo(): SignatureAlgo {
    return this.props.signatureAlgo;
  }
  get active(): boolean {
    return this.props.active;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  toJSON(): WebhookEndpointProps {
    return { ...this.props };
  }
}
