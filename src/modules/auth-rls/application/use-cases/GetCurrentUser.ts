import type { UserContext } from "../../domain/UserContext";
import type { AuthProvider } from "../ports/AuthProvider";

// SOLID: SRP — obter o usuário autenticado atual. SOLID: DIP — depende da port.
// Retorna UserContext | null: ausência de sessão é estado normal, não erro.
export class GetCurrentUser {
  constructor(private readonly auth: AuthProvider) {}

  async execute(): Promise<UserContext | null> {
    return this.auth.getCurrentUser();
  }
}
