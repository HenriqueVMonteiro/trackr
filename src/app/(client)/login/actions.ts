"use server";

import { redirect } from "next/navigation";

import { createAuthRlsModule } from "@/modules/auth-rls";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

// Interface layer: server actions delegate IMMEDIATELY to the module use cases.
export async function signInAction(formData: FormData): Promise<void> {
  const result = await createAuthRlsModule().signIn.execute({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!result.ok) {
    redirect(`/login?error=${encodeURIComponent(result.error.message)}`);
  }
  redirect("/");
}

export async function signUpAction(formData: FormData): Promise<void> {
  const name = field(formData, "name");
  const result = await createAuthRlsModule().signUp.execute({
    email: field(formData, "email"),
    password: field(formData, "password"),
    ...(name ? { name } : {}),
  });
  if (!result.ok) {
    redirect(`/login?error=${encodeURIComponent(result.error.message)}`);
  }
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  await createAuthRlsModule().signOut.execute();
  redirect("/login");
}
