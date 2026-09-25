"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { SocketProvider } from "./socket-provider";

export function AppProviders({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SocketProvider userId={userId}>{children}</SocketProvider>
      <Toaster richColors closeButton position="top-right" />
    </QueryClientProvider>
  );
}
