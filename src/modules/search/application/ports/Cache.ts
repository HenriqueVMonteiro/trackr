// SOLID: DIP — a aplicação depende desta abstração de cache; o adapter concreto
// (UpstashRedisCache) é injetado no bootstrap. Mantém o módulo agnóstico ao
// provedor de cache (Redis, in-memory, etc.).
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}
