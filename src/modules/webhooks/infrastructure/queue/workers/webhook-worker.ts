import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";

import { retryStrategyFor } from "../../../application/retry";
import { signerFor } from "../../sign";
import type { WebhookRepository } from "../../../application/ports/WebhookRepository";
import type { DeliveryRepository } from "../../../application/ports/DeliveryRepository";
import type { RecordAttempt } from "../../../application/use-cases/RecordAttempt";
import type {
  BullMqDeliveryQueue} from "../BullMqDeliveryQueue";
import {
  WEBHOOK_QUEUE_NAME,
  type WebhookJobData,
} from "../BullMqDeliveryQueue";

export interface WebhookWorkerDeps {
  connection: Redis;
  webhookRepo: WebhookRepository;
  deliveryRepo: DeliveryRepository;
  recordAttempt: RecordAttempt;
  queue: BullMqDeliveryQueue;
}

// Worker que consome a fila, ASSINA o payload (WebhookSigner / LSP), faz POST
// HTTPS, registra a tentativa (RecordAttempt) e re-enfileira com o delay da
// RetryStrategy (GoF: Strategy) do endpoint enquanto houver tentativas.
//
// Como iniciar (processo separado): montar um WebhooksModule + connection e
// chamar createWebhookWorker(...). Não auto-executa no import.
export function createWebhookWorker(deps: WebhookWorkerDeps): Worker<WebhookJobData> {
  return new Worker<WebhookJobData>(
    WEBHOOK_QUEUE_NAME,
    async (job: Job<WebhookJobData>) => {
      const delivery = await deps.deliveryRepo.findById(job.data.deliveryId);
      if (!delivery) return;
      const endpoint = await deps.webhookRepo.findById(delivery.endpointId);
      if (!endpoint) return;

      const body = JSON.stringify({ event: delivery.eventType, data: delivery.payload });
      const signature = signerFor(endpoint.signatureAlgo).sign(body, endpoint.secret);

      let statusCode: number | undefined;
      let responseBody: string | undefined;
      let error: string | undefined;
      try {
        const res = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-trackr-event": delivery.eventType,
            "x-trackr-signature": signature,
          },
          body,
        });
        statusCode = res.status;
        responseBody = (await res.text()).slice(0, 2000);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }

      const result = await deps.recordAttempt.execute({
        deliveryId: delivery.id,
        statusCode,
        responseBody,
        error,
      });

      // GoF: Strategy — re-enfileira com o backoff da política do endpoint.
      if (result.ok && result.value.delivery.status === "failed") {
        const strategy = retryStrategyFor(endpoint.retryPolicy);
        const attempt = result.value.delivery.attemptCount;
        if (strategy.shouldRetry(attempt)) {
          await deps.queue.enqueueRetry(delivery, attempt + 1, strategy.nextDelayMs(attempt + 1));
        }
      }
    },
    { connection: deps.connection },
  );
}
