import { redirect } from "next/navigation";
import { LogoIcon } from "@/components/icons";

// Skip static prerender so the page renders at request time. Otherwise
// the build tries to prerender /login while the Supabase env vars used
// by the auth-rls middleware are not set in the build environment.
export const dynamic = "force-dynamic";

async function signInDemo() {
  "use server";
  redirect("/trackr");
}

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-logo">
        <LogoIcon size={48} color="#1f2328" />
      </div>
      <h1 className="text-2xl font-light mb-4 text-center text-[color:var(--color-fg-default)]">
        Sign in to Trackr
      </h1>
      <form className="login-card" action={signInDemo}>
        <label className="block mb-4">
          <span className="field-label">Email address</span>
          <input
            className="form-control"
            type="email"
            name="email"
            defaultValue="henrique@trackr.dev"
            required
          />
        </label>
        <label className="block mb-[18px]">
          <div className="flex justify-between items-center mb-1.5">
            <span className="field-label" style={{ marginBottom: 0 }}>
              Password
            </span>
            <a href="/login" className="text-xs">
              Forgot password?
            </a>
          </div>
          <input className="form-control" type="password" name="password" defaultValue="········" required />
        </label>
        <button type="submit" className="btn btn-primary btn-block">
          Sign in
        </button>
      </form>
      <div className="login-alt">
        New to Trackr? <a href="/register">Create an account</a>
      </div>
      <div
        className="muted text-xs text-center"
        style={{ marginTop: 40, marginBottom: 40 }}
      >
        Trackr · Arquitetura de Software · Grupo 1 · <a href="/login">Terms</a> · <a href="/login">Privacy</a> ·{" "}
        <a href="/login">Docs</a>
      </div>
    </div>
  );
}
