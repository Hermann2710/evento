import { getCurrentUser } from "@/lib/auth/guards";
import { secret } from "@/lib/site";
import { signPayload } from "@/lib/tokens";

export const dynamic = "force-dynamic";

/** Issues a short-lived signed token used to authenticate the Socket.IO handshake. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const token = signPayload(secret("REALTIME_SECRET"), { uid: user.id, role: user.role, exp: Date.now() + 5 * 60_000 });
  return Response.json({ token }, { headers: { "Cache-Control": "private, no-store" } });
}
