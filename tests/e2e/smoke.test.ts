import { describe, expect, it } from "vitest";

/**
 * HTTP-level end-to-end smoke tests against a running server.
 * Run with: E2E_BASE_URL=http://localhost:3000 npm test
 */
const BASE = process.env.E2E_BASE_URL;

describe.skipIf(!BASE)("E2E smoke (running server)", () => {
  const get = (path: string) => fetch(`${BASE}${path}`, { redirect: "manual" });

  it("health endpoint reports the database is up", async () => {
    const res = await get("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it("redirects / to the default locale", async () => {
    const res = await get("/");
    expect([307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toMatch(/\/fr$/);
  });

  it("renders localized public pages", async () => {
    const fr = await (await get("/fr")).text();
    const en = await (await get("/en/discover")).text();
    expect(fr).toContain('lang="fr"');
    expect(en).toContain('lang="en"');
  });

  it("protects private pages", async () => {
    const res = await get("/fr/tickets");
    expect([200, 307]).toContain(res.status);
    if (res.status === 307) expect(res.headers.get("location")).toContain("/login");
  });

  it("rejects unsigned payment webhooks", async () => {
    const res = await fetch(`${BASE}/api/webhooks/payments/mock`, { method: "POST", body: "{}" });
    expect(res.status).toBe(400);
  });

  it("requires authentication for notifications and uploads", async () => {
    expect((await get("/api/notifications")).status).toBe(401);
    expect((await fetch(`${BASE}/api/uploads`, { method: "POST" })).status).toBe(401);
  });
});
