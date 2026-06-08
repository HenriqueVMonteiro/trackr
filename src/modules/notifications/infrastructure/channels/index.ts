import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { Channel } from "../../domain/Channel";
import type { NotificationChannel } from "../../application/ports/NotificationChannel";
import { ResendEmailChannel } from "./ResendEmailChannel";
import { WebPushChannel } from "./WebPushChannel";
import { RealtimeChannel } from "./RealtimeChannel";

export { ResendEmailChannel } from "./ResendEmailChannel";
export { WebPushChannel, type VapidDetails } from "./WebPushChannel";
export { RealtimeChannel } from "./RealtimeChannel";

// Monta o mapa canal -> adapter a partir do ambiente. Canais sem credencial não
// são registrados (SendNotification marca como failed: no adapter). É
// infraestrutura, então pode ler process.env. SOLID: OCP — registrar um canal
// novo é adicionar um bloco aqui, sem tocar nos use cases.
export function buildNotificationChannels(): ReadonlyMap<Channel, NotificationChannel> {
  const channels = new Map<Channel, NotificationChannel>();

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const from = process.env.NOTIFICATIONS_EMAIL_FROM ?? "Trackr <noreply@trackr.local>";
    channels.set("email", new ResendEmailChannel(new Resend(resendKey), from));
  }

  const pub = process.env.WEB_PUSH_PUBLIC_KEY;
  const priv = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT;
  if (pub && priv && subject) {
    channels.set("push", new WebPushChannel({ subject, publicKey: pub, privateKey: priv }));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    channels.set("in_app", new RealtimeChannel(createClient(url, serviceKey)));
  }

  return channels;
}
