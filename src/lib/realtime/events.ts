/** Shared contract between the Next.js app, the Socket.IO server and clients. */
export const SOCKET_EVENTS = {
  notification: "notification:new",
  bookingStatus: "booking:status",
  paymentStatus: "payment:status",
  ticketAvailability: "tickets:availability",
  joinEvent: "room:join-event",
  leaveEvent: "room:leave-event",
  joinBooking: "room:join-booking",
} as const;

export const rooms = {
  user: (id: string) => `user:${id}`,
  event: (id: string) => `event:${id}`,
  booking: (id: string) => `booking:${id}`,
};

export type TicketAvailabilityPayload = {
  eventId: string;
  ticketTypes: Array<{ id: string; remaining: number }>;
};

export type BookingStatusPayload = { bookingId: string; status: string };
export type PaymentStatusPayload = { bookingId: string; paymentId: string; status: string };
