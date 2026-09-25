/**
 * Publishes an event to the standalone Socket.IO server.
 * PostgreSQL remains the source of truth: realtime is a best-effort signal and
 * clients always refetch authoritative data. No-op when realtime is not configured.
 */
export async function publish(room: string, event: string, payload: unknown): Promise<void> {
  const url = process.env.REALTIME_INTERNAL_URL;
  const secretValue = process.env.REALTIME_SECRET;
  if (!url || !secretValue || !process.env.NEXT_PUBLIC_SOCKET_URL) return;
  try {
    await fetch(`${url.replace(/\/$/, "")}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secretValue}` },
      body: JSON.stringify({ room, event, payload }),
      signal: AbortSignal.timeout(1500),
    });
  } catch (error) {
    console.warn("[realtime] publish failed", error instanceof Error ? error.message : error);
  }
}
