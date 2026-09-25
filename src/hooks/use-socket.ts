"use client";

import { useEffect, useRef } from "react";
import { useSocketContext } from "@/providers/socket-provider";

/** Subscribes to a socket event for the lifetime of the component. */
export function useSocketEvent<T>(event: string, handler: (payload: T) => void): boolean {
  const { socket, connected } = useSocketContext();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  }, [handler]);
  useEffect(() => {
    if (!socket) return;
    const listener = (payload: T) => ref.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
  return connected;
}

/** Joins a room (e.g. an event or booking) and leaves it on unmount / reconnect. */
export function useSocketRoom(joinEvent: string, id: string | null, leaveEvent?: string): void {
  const { socket, connected } = useSocketContext();
  useEffect(() => {
    if (!socket || !connected || !id) return;
    socket.emit(joinEvent, id);
    return () => {
      if (leaveEvent) socket.emit(leaveEvent, id);
    };
  }, [socket, connected, id, joinEvent, leaveEvent]);
}
