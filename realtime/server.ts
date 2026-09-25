/**
 * Standalone Socket.IO server (run with `npm run realtime`).
 *
 * - Authentication: short-lived HMAC token issued by /api/realtime/token (handshake `auth.token`).
 * - Rooms: user:{id} (private, auto-joined), event:{id} (public availability), booking:{id} (owner only).
 * - Publishing: the Next.js server POSTs to /publish with a shared secret (REALTIME_SECRET).
 * - PostgreSQL stays the source of truth; clients refetch on every signal.
 */
import "dotenv/config";
import { createServer, type IncomingMessage } from "node:http";
import { Server } from "socket.io";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { bookings } from "../src/db/schema";
import { rooms, SOCKET_EVENTS } from "../src/lib/realtime/events";
import { safeEqual, verifyPayload } from "../src/lib/tokens";

const PORT = Number(process.env.REALTIME_PORT || 4001);
const SECRET = process.env.REALTIME_SECRET || process.env.AUTH_SECRET || "";
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROOM = /^(user|event|booking):[0-9a-f-]{36}$/i;
const PUBLISHABLE = new Set<string>([
  SOCKET_EVENTS.notification,
  SOCKET_EVENTS.bookingStatus,
  SOCKET_EVENTS.paymentStatus,
  SOCKET_EVENTS.ticketAvailability,
]);

if (!SECRET) {
  console.error("[realtime] REALTIME_SECRET or AUTH_SECRET is required");
  process.exit(1);
}

function readBody(req: IncomingMessage, limit = 64 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

const httpServer = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200).end("ok");
    return;
  }
  if (req.method !== "POST" || req.url !== "/publish") {
    res.writeHead(404).end();
    return;
  }
  const auth = req.headers.authorization ?? "";
  if (!safeEqual(auth, `Bearer ${SECRET}`)) {
    res.writeHead(401).end();
    return;
  }
  try {
    const { room, event, payload } = JSON.parse(await readBody(req)) as { room?: string; event?: string; payload?: unknown };
    if (!room || !ROOM.test(room) || !event || !PUBLISHABLE.has(event)) {
      res.writeHead(400).end();
      return;
    }
    io.to(room).emit(event, payload);
    res.writeHead(204).end();
  } catch {
    res.writeHead(400).end();
  }
});

const io = new Server(httpServer, {
  cors: { origin: ORIGIN, credentials: true },
  pingInterval: 25_000,
  pingTimeout: 20_000,
  connectionStateRecovery: { maxDisconnectionDuration: 2 * 60_000 },
});

io.use((socket, next) => {
  const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
  if (typeof token === "string") {
    const data = verifyPayload<{ uid: string; exp: number }>(SECRET, token);
    if (!data) return next(new Error("unauthorized"));
    socket.data.userId = data.uid;
  }
  next();
});

io.on("connection", (socket) => {
  const userId = socket.data.userId as string | undefined;
  if (userId) socket.join(rooms.user(userId));

  socket.on(SOCKET_EVENTS.joinEvent, (id: unknown) => {
    if (typeof id === "string" && UUID.test(id)) socket.join(rooms.event(id));
  });
  socket.on(SOCKET_EVENTS.leaveEvent, (id: unknown) => {
    if (typeof id === "string") socket.leave(rooms.event(id));
  });
  // Authorization: only the booking owner may join its room.
  socket.on(SOCKET_EVENTS.joinBooking, async (id: unknown) => {
    if (!userId || typeof id !== "string" || !UUID.test(id)) return;
    const [row] = await db.select({ userId: bookings.userId }).from(bookings).where(eq(bookings.id, id)).limit(1);
    if (row?.userId === userId) socket.join(rooms.booking(id));
  });
});

httpServer.listen(PORT, () => console.info(`[realtime] listening on :${PORT} (origin ${ORIGIN})`));

function shutdown() {
  io.close();
  httpServer.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
