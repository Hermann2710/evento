import { cache } from "react";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type UserRole } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { auth } from "./index";

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  image: string | null;
  role: UserRole;
  status: "active" | "suspended" | "banned";
  isEmailVerified: boolean;
  locale: string;
  createdAt: Date;
};

/**
 * Returns the authenticated user, always re-read from the database so that
 * role changes, suspensions and bans take effect immediately. Never exposes passwordHash.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const [user] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phoneNumber: users.phoneNumber,
      image: users.image,
      role: users.role,
      status: users.status,
      isEmailVerified: users.isEmailVerified,
      locale: users.locale,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user || user.status !== "active") return null;
  return user;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const locale = await getLocale();
    return redirect({ href: "/login", locale });
  }
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) notFound();
  return user;
}

export function hasRole(user: Pick<CurrentUser, "role"> | null, roles: UserRole[]): boolean {
  return Boolean(user && roles.includes(user.role));
}
