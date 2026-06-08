# `notifications` — Notificações multi-canal

Notificações por **Factory Method** com canais plugáveis (e-mail, push, in-app) e
um subscriber Observer que reage a `issue.assigned`.

## Camadas

```
notifications/
├── domain/
│   ├── Channel.ts               # union de canais
│   ├── Notification.ts          # abstract + Email/Push/InApp/Webhook (Product do Factory Method)
│   └── errors.ts                # ChannelDeliveryError
├── application/
│   ├── NotificationFactory.ts   # GoF: Factory Method (Creator + 4 concretos)
│   ├── ports/                   # NotificationChannel (OCP/DIP), NotificationRepository
│   └── use-cases/               # SendNotification, UpdatePreferences, SubscribeUserToTopic
├── infrastructure/
│   ├── DrizzleNotificationRepository.ts
│   └── channels/                # ResendEmailChannel, WebPushChannel, RealtimeChannel + buildNotificationChannels(env)
├── interface/subscribers/
│   └── IssueAssignedSubscriber.ts   # GoF: Observer (issue.assigned -> SendNotification)
└── index.ts                     # createNotificationsModule({ db, clock, ids, events, channels? })
```

Schema em [`src/infrastructure/db/schema/notifications.ts`](../../infrastructure/db/schema/notifications.ts).

## Padrões evidenciados

- **GoF: Factory Method** — `NotificationFactory` (Creator) + `EmailNotificationFactory`/… criam o `Notification` concreto por canal.
- **GoF: Observer** — `IssueAssignedSubscriber` no `EventBus`.
- **GoF: Adapter** — cada `NotificationChannel` adapta um SDK (Resend/web-push/Supabase Realtime).
- **SOLID: OCP** — registrar um canal novo (ex.: Slack) é uma classe + uma entrada em `buildNotificationChannels`; `SendNotification` não muda.
- **SOLID: DIP** — use cases dependem das ports, não dos SDKs.

## Status

`SendNotification` + Factory Method + preferências: testados (unit). Os 3 channel
adapters compilam e seguem a port; **rodam de verdade quando as credenciais
existem** (`RESEND_API_KEY`, `WEB_PUSH_*`, Supabase service role) — `buildNotificationChannels`
só registra os canais com credencial. Sem credencial, `SendNotification` grava a
notificação com status `failed` (no adapter). Teste de integração → **B12**.
