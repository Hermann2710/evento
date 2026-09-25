import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { assertUuid, spFirst } from "@/lib/params";
import { MockPayPage } from "@/features/payments/pages/mock-pay-page";

type Props = { params: Promise<{ locale: string; bookingId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "pay", "/pay", { noindex: true });
}

export default async function Page({ params, searchParams }: Props) {
  const [{ bookingId }, sp] = await Promise.all([params, searchParams]);
  return <MockPayPage bookingId={assertUuid(bookingId)} paymentId={spFirst(sp.payment)} />;
}
