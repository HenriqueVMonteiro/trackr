import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export function createDbClient(connectionString: string): Database {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create db client");
  }
  const queryClient = postgres(connectionString, {
    max: 10,
    prepare: false,
  });
  return drizzle(queryClient, { schema });
}
