import type { ReactNode } from "react";
import "./globals.css";

// The <html> element is rendered by the localized layout in app/[locale]/layout.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
