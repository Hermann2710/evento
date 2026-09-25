import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { assertUuid } from "@/lib/params";
import { TicketDetailPage } from "@/features/tickets/pages/ticket-pages";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "ticket", "/ticket", { noindex: true });
}

export default async function Page({ params }: Props) {
  const p = await params;
  const id = assertUuid(p.id);
  return <TicketDetailPage ticketId={id} />;
}
