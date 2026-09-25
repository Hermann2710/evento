import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, resetPasswordSchema } from "@/features/auth/validations/auth";
import { profileSchema, changePasswordSchema } from "@/features/profile/validations";
import { eventFormSchema } from "@/features/events/validations/event-form";
import { parseSearchParams } from "@/features/search/validations";
import { createBookingSchema } from "@/features/booking/validations";
import { reviewSchema } from "@/features/reviews/validations";
import { createCommentSchema } from "@/features/comments/validations";

const validRegister = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phoneNumber: "",
  password: "Secret123",
  confirmPassword: "Secret123",
};

const messages = (r: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
  r.success ? [] : r.error!.issues.map((i) => i.message);

describe("registration validation", () => {
  it("accepts a valid payload", () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });
  it("returns translatable codes (never UI text)", () => {
    const r = registerSchema.safeParse({ ...validRegister, email: "nope", password: "short", confirmPassword: "x" });
    expect(messages(r)).toEqual(expect.arrayContaining(["invalid_email", "password_too_short", "passwords_mismatch"]));
  });
  it("rejects weak passwords and invalid phones", () => {
    const r = registerSchema.safeParse({ ...validRegister, password: "onlyletters", confirmPassword: "onlyletters", phoneNumber: "abc" });
    expect(messages(r)).toEqual(expect.arrayContaining(["password_weak", "invalid_phone"]));
  });
});

describe("login & password reset validation", () => {
  it("requires email and password", () => {
    expect(messages(loginSchema.safeParse({ email: "", password: "" }))).toEqual(expect.arrayContaining(["required"]));
  });
  it("requires matching passwords for reset", () => {
    const r = resetPasswordSchema.safeParse({ token: "x".repeat(20), password: "Secret123", confirmPassword: "Other123" });
    expect(messages(r)).toContain("passwords_mismatch");
  });
  it("requires matching passwords for password change", () => {
    const r = changePasswordSchema.safeParse({ currentPassword: "a", newPassword: "Secret123", confirmPassword: "nope" });
    expect(messages(r)).toContain("passwords_mismatch");
  });
});

describe("profile validation (mass assignment protection)", () => {
  it("strips forbidden fields such as role, status, id or passwordHash", () => {
    const r = profileSchema.safeParse({ firstName: "A", lastName: "B", phoneNumber: "", image: "", role: "ADMIN", status: "active", id: "x", passwordHash: "h" });
    expect(r.success).toBe(true);
    expect(Object.keys(r.data!)).toEqual(["firstName", "lastName", "phoneNumber", "image"]);
  });
});

const validEvent = {
  title: "My event",
  description: "A long enough description for the event.",
  categoryId: "3f1c1a3e-9a3c-4b9e-8b1a-2d6b6f0f9e11",
  coverImage: "",
  gallery: [],
  location: "Venue",
  city: "Douala",
  country: "Cameroun",
  startDate: "2030-05-01T20:00",
  endDate: "2030-05-01T23:00",
  timezone: "Africa/Douala",
  capacity: 100,
  currency: "XAF" as const,
  ticketTypes: [{ id: "", name: "Standard", description: "", price: 10, quantity: 100, salesStart: "", salesEnd: "" }],
};

describe("event creation validation", () => {
  it("accepts a valid event", () => {
    expect(eventFormSchema.safeParse(validEvent).success).toBe(true);
  });
  it("rejects end before start", () => {
    expect(messages(eventFormSchema.safeParse({ ...validEvent, endDate: "2030-05-01T10:00" }))).toContain("end_before_start");
  });
  it("rejects ticket quantities above capacity", () => {
    expect(messages(eventFormSchema.safeParse({ ...validEvent, capacity: 50 }))).toContain("capacity_exceeded");
  });
  it("requires at least one ticket type and a valid timezone", () => {
    const r = eventFormSchema.safeParse({ ...validEvent, ticketTypes: [], timezone: "Mars/Olympus" });
    expect(messages(r)).toEqual(expect.arrayContaining(["ticket_types_required", "invalid_timezone"]));
  });
});

describe("search params validation", () => {
  it("parses valid params", () => {
    const p = parseSearchParams({ category: "music", city: "douala", sort: "price_asc", page: "2", priceMax: "50" });
    expect(p).toMatchObject({ category: "music", city: "douala", sort: "price_asc", page: 2, priceMax: 50 });
  });
  it("falls back to safe defaults for invalid values", () => {
    const p = parseSearchParams({ sort: "DROP TABLE", page: "-4", category: "<script>", date: "yesterday", priceMin: "abc" });
    expect(p).toMatchObject({ sort: "date", page: 1, category: undefined, date: undefined, priceMin: undefined });
  });
});

describe("booking, review and comment validation", () => {
  const id = "3f1c1a3e-9a3c-4b9e-8b1a-2d6b6f0f9e11";
  it("rejects duplicate ticket types and excessive quantities", () => {
    expect(createBookingSchema.safeParse({ eventId: id, items: [{ ticketTypeId: id, quantity: 1 }, { ticketTypeId: id, quantity: 1 }] }).success).toBe(false);
    expect(createBookingSchema.safeParse({ eventId: id, items: [{ ticketTypeId: id, quantity: 50 }] }).success).toBe(false);
  });
  it("enforces rating 1-5", () => {
    expect(reviewSchema.safeParse({ eventId: id, rating: 6, content: "Great show" }).success).toBe(false);
    expect(reviewSchema.safeParse({ eventId: id, rating: 5, content: "Great show" }).success).toBe(true);
  });
  it("rejects empty comments", () => {
    expect(createCommentSchema.safeParse({ eventId: id, content: "   " }).success).toBe(false);
  });
});
