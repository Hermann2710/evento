import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";

type OAuthInput = {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
  providerAccountId: string;
  type: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  idToken?: string;
  scope?: string;
  tokenType?: string;
};

/** Finds or creates the local user for an OAuth sign-in and links the account. */
export async function upsertOAuthUser(input: OAuthInput): Promise<string> {
  const email = input.email.toLowerCase();
  return db.transaction(async (tx) => {
    let [user] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      const [first = "", ...rest] = (input.name ?? "").trim().split(/\s+/);
      [user] = await tx
        .insert(users)
        .values({
          email,
          firstName: first.slice(0, 100),
          lastName: rest.join(" ").slice(0, 100),
          image: input.image ?? null,
          isEmailVerified: true,
          emailVerified: new Date(),
        })
        .returning({ id: users.id });
    }
    await tx
      .insert(accounts)
      .values({
        userId: user.id,
        type: input.type,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
        idToken: input.idToken,
        scope: input.scope,
        tokenType: input.tokenType,
      })
      .onConflictDoNothing();
    return user.id;
  });
}
