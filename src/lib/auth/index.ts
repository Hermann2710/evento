import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { loginSchema } from "@/features/auth/validations/auth";
import { upsertOAuthUser } from "@/features/auth/services/oauth";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

class AuthCodeError extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

export const isGoogleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) throw new AuthCodeError("invalid_credentials");
      const email = parsed.data.email.toLowerCase();
      if (!rateLimit(`login:${email}`, 10, 15 * 60_000).ok) throw new AuthCodeError("rate_limited");

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          image: users.image,
          passwordHash: users.passwordHash,
          status: users.status,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
        throw new AuthCodeError("invalid_credentials");
      }
      if (user.status === "banned") throw new AuthCodeError("account_banned");
      if (user.status === "suspended") throw new AuthCodeError("account_suspended");

      return { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`.trim(), image: user.image };
    },
  }),
];

if (isGoogleEnabled) {
  providers.push(
    Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/fr/login", error: "/fr/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const [existing] = await db.select({ status: users.status }).from(users).where(eq(users.email, email)).limit(1);
      return !existing || existing.status === "active";
    },
    async jwt({ token, user, account }) {
      if (account && account.provider !== "credentials" && user?.email) {
        token.sub = await upsertOAuthUser({
          email: user.email,
          name: user.name,
          image: user.image,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          type: account.type,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          idToken: account.id_token,
          scope: account.scope,
          tokenType: account.token_type,
        });
      } else if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
