import type { Redis } from "@upstash/redis";
import type { Cache } from "@/modules/search/application/ports/Cache";

// SOLID: DIP — adapter concreto da port Cache sobre @upstash/redis. Vive em
// src/infrastructure/cache (área de infra compartilhada). A aplicação depende
// só da interface Cache; este adapter é injetado no bootstrap.
export class UpstashRedisCache implements Cache {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    return this.redis.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, { ex: ttlSeconds });
  }
}
