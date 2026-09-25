import "dotenv/config";

process.env.AUTH_SECRET ||= "test-auth-secret";
process.env.PAYMENT_WEBHOOK_SECRET ||= "test-webhook-secret";
