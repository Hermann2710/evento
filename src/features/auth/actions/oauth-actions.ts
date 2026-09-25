"use server";

import { getLocale } from "next-intl/server";
import { signIn } from "@/lib/auth";

export async function googleSignInAction(): Promise<void> {
  const locale = await getLocale();
  await signIn("google", { redirectTo: `/${locale}` });
}
