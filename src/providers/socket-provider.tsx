"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SOCKET_EVENTS } from "@/lib/realtime/events";

type SocketState = { socket: Socket | null; connected: boolean };
const SocketContext = createContext<SocketState>({ socket: null, connected: false });

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

/**
 * Connects to the realtime server when configured. Authenticated users receive a short-lived
 * signed token so the server can put them in their private room. Handles reconnection & cleanup.
 */
export function SocketProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [state, setState] = useState<SocketState>({ socket: null, connected: false });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!SOCKET_URL) return;
    let socket: Socket | null = null;
    let cancelled = false;

    async function connect() {
      let token: string | undefined;
      if (userId) {
        const res = await fetch("/api/realtime/token", { cache: "no-store" }).catch(() => null);
        if (res?.ok) token = ((await res.json()) as { token?: string }).token;
      }
      if (cancelled) return;
      socket = io(SOCKET_URL, {
        auth: token ? { token } : {},
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
      });
      socket.on("connect", () => setState({ socket, connected: true }));
      socket.on("disconnect", () => setState({ socket, connected: false }));
      socket.on(SOCKET_EVENTS.notification, (payload: { title?: string }) => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        if (payload?.title) toast.info(payload.title);
      });
      setState({ socket, connected: socket.connected });
    }

    connect();
    return () => {
      cancelled = true;
      socket?.removeAllListeners();
      socket?.disconnect();
      setState({ socket: null, connected: false });
    };
  }, [userId, queryClient]);

  return <SocketContext.Provider value={state}>{children}</SocketContext.Provider>;
}

export function useSocketContext(): SocketState {
  return useContext(SocketContext);
}
