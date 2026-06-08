import { LogoIcon } from "@/components/icons";
import { registerAction } from "@/app/(client)/_actions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="login-wrap">
      <div className="login-logo">
        <LogoIcon size={48} color="#1f2328" />
      </div>
      <h1 className="text-2xl font-light mb-4 text-center text-[color:var(--color-fg-default)]">
        Create your account
      </h1>
      <form className="login-card" action={registerAction}>
        {error && (
          <div className="mb-3 rounded border border-[color:var(--color-danger-emphasis)] bg-[color:var(--color-danger-subtle)] px-3 py-2 text-sm text-[color:var(--color-danger-fg)]">
            Could not create the account/workspace. Check the form and database setup.
          </div>
        )}
        <label className="block mb-4">
          <span className="field-label">Full name</span>
          <input
            className="form-control"
            type="text"
            name="name"
            defaultValue=""
            placeholder="Your name"
            required
          />
        </label>
        <label className="block mb-4">
          <span className="field-label">Email address</span>
          <input
            className="form-control"
            type="email"
            name="email"
            defaultValue=""
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="block mb-3">
          <span className="field-label">Password</span>
          <input
            className="form-control"
            type="password"
            name="password"
            defaultValue=""
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
          <div className="muted text-xs mt-1.5">
            Make sure it&apos;s at least 8 characters including a number and a lowercase letter.
          </div>
        </label>
        <label className="block mb-[18px]">
          <span className="field-label">Workspace slug</span>
          <input
            className="form-control"
            type="text"
            name="slug"
            defaultValue=""
            placeholder="my-team"
            pattern="[a-z][a-z0-9-]{1,30}"
            title="lowercase kebab-case, 2-31 chars"
            required
          />
          <div className="muted text-xs mt-1.5">
            Lowercase kebab-case. This becomes part of your URLs (e.g. /your-slug).
          </div>
        </label>
        <button type="submit" className="btn btn-primary btn-block">
          Create account
        </button>
      </form>
      <div className="login-alt">
        Already have an account? <a href="/login">Sign in</a>
      </div>
      <div
        className="muted text-xs text-center"
        style={{ marginTop: 40, marginBottom: 40 }}
      >
        By creating an account, you agree to the{" "}
        <a href="/login">Terms of Service</a> and{" "}
        <a href="/login">Privacy Statement</a>.
      </div>
    </div>
  );
}
