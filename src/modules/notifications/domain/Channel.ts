export type Channel = "email" | "push" | "in_app" | "webhook";

export const CHANNELS: readonly Channel[] = ["email", "push", "in_app", "webhook"];

export function isChannel(value: string): value is Channel {
  return (CHANNELS as readonly string[]).includes(value);
}
