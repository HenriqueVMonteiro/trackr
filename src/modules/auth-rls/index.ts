// Public barrel for the `auth-rls` module. Cross-module consumers and the Next.js
// app import ONLY from here.
//
// GoF: Factory (composition) — `createAuthRlsModule` wires the concrete adapter to
// the module's use cases in one place; no singletons, deps are injected.
// SOLID: DIP — the composition root depends on the `AuthProvider` abstraction.
import { SignIn, SignUp, SignOut, GetCurrentUser } from "./application";
import type { AuthProvider } from "./application";
import { SupabaseAuthProvider } from "./infrastructure/SupabaseAuthProvider";

export type * from "./domain";
export type {
  AuthProvider,
  AuthError,
  SignInCredentials,
  SignUpCredentials,
  SignInInput,
  SignInError,
  SignUpInput,
  SignUpError,
} from "./application";

// Server entrypoints (interface layer).
export { getCurrentUser } from "./interface/getCurrentUser";
export { updateSession } from "./interface/middleware";

export interface AuthRlsModuleDeps {
  // Optional override lets tests/composition inject a fake AuthProvider (LSP).
  authProvider?: AuthProvider;
}

export interface AuthRlsModule {
  authProvider: AuthProvider;
  signIn: SignIn;
  signUp: SignUp;
  signOut: SignOut;
  getCurrentUser: GetCurrentUser;
}

export function createAuthRlsModule(deps: AuthRlsModuleDeps = {}): AuthRlsModule {
  const authProvider = deps.authProvider ?? new SupabaseAuthProvider();
  return {
    authProvider,
    signIn: new SignIn(authProvider),
    signUp: new SignUp(authProvider),
    signOut: new SignOut(authProvider),
    getCurrentUser: new GetCurrentUser(authProvider),
  };
}
