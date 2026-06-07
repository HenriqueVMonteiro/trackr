import type { AuthProvider } from "../ports/AuthProvider";

// SOLID: SRP — encerrar a sessão. SOLID: DIP — depende da port AuthProvider.
// Sign-out limpa o cookie de sessão; não há erro de negócio previsível, então
// retorna void (sem Result).
export class SignOut {
  constructor(private readonly auth: AuthProvider) {}

  async execute(): Promise<void> {
    await this.auth.signOut();
  }
}
