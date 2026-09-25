import { getCurrentUser } from "@/lib/auth/guards";
import { countUnread, listNotifications } from "@/features/notifications/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const limit = Math.min(20, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 6));
  const [{ items }, unread] = await Promise.all([
    listNotifications(user.id, { pageSize: limit }),
    countUnread(user.id),
  ]);
  return Response.json({ items, unread }, { headers: { "Cache-Control": "private, no-store" } });
}
