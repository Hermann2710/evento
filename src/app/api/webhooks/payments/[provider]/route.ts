import { handlePaymentWebhook } from "@/features/payments/services/webhook-service";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return Response.json({ error: "payload_too_large" }, { status: 413 });
  const result = await handlePaymentWebhook(provider, rawBody, request.headers);
  return Response.json(result.body, { status: result.status });
}
