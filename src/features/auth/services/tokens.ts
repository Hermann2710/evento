import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { randomToken, sha256 } from "@/lib/tokens";

type TokenType = "email_verification" | "password_reset";

export const TOKEN_TTL_MS: Record<TokenType, number> = {
  email_verification: 24 * 60 * 60 * 1000,
  password_reset: 60 * 60 * 1000,
};

/** Creates a random token; only its SHA-256 hash is persisted. Previous tokens are revoked. */
export async function createUserToken(userId: string, identifier: string, type: TokenType): Promise<string> {
  const token = randomToken(32);
  await db.transaction(async (tx) => {
    await tx
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(verificationTokens.userId, userId), eq(verificationTokens.type, type), isNull(verificationTokens.usedAt)));
    await tx.insert(verificationTokens).values({
      userId,
      identifier,
      type,
      tokenHash: sha256(token),
      expires: new Date(Date.now() + TOKEN_TTL_MS[type]),
    });
  });
  return token;
}

/** Atomically consumes a token (single use). Returns null when invalid, used or expired. */
export async function consumeUserToken(
  token: string,
  type: TokenType,
): Promise<{ userId: string; identifier: string } | null> {
  const [row] = await db
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(verificationTokens.tokenHash, sha256(token)),
        eq(verificationTokens.type, type),
        isNull(verificationTokens.usedAt),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .returning({ userId: verificationTokens.userId, identifier: verificationTokens.identifier });
  return row ?? null;
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const row = await consumeUserToken(token, "email_verification");
  if (!row) return false;
  await db
    .update(users)
    .set({ isEmailVerified: true, emailVerified: new Date() })
    .where(and(eq(users.id, row.userId), eq(users.email, row.identifier)));
  return true;
}
