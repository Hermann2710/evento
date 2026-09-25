import "dotenv/config";
import { count, eq } from "drizzle-orm";
import { db, pool } from "./index";
import { bookingItems, bookings, categories, comments, eventImages, events, organizers, reviews, ticketTypes, users } from "./schema";
import { hashPassword } from "../lib/password";
import { confirmBookingTx } from "../features/booking/services/booking-service";

const IMG = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200`;
const day = 86_400_000;
const at = (days: number, hour = 19) => {
  const d = new Date(Date.now() + days * day);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};

async function main() {
  const [{ total }] = await db.select({ total: count() }).from(categories);
  if (total > 0) {
    console.info("[seed] database already seeded — skipping");
    return;
  }

  const cats = await db
    .insert(categories)
    .values([
      { name: "Musique", slug: "music", description: "Concerts et live" },
      { name: "Conférences", slug: "conferences", description: "Talks et keynotes" },
      { name: "Festivals", slug: "festivals" },
      { name: "Tech", slug: "tech" },
      { name: "Arts & Culture", slug: "arts" },
      { name: "Gastronomie", slug: "food" },
      { name: "Business", slug: "business" },
      { name: "Sport", slug: "sport" },
    ])
    .returning();
  const cat = (slug: string) => cats.find((c) => c.slug === slug)!.id;

  const [admin, org1, org2, attendee] = await db
    .insert(users)
    .values([
      { firstName: "Ada", lastName: "Admin", email: "admin@evento.app", passwordHash: await hashPassword("Admin12345"), role: "ADMIN", isEmailVerified: true, emailVerified: new Date() },
      { firstName: "Olivia", lastName: "Mbarga", email: "organizer@evento.app", passwordHash: await hashPassword("Organizer123"), role: "ORGANIZER", isEmailVerified: true, emailVerified: new Date() },
      { firstName: "Koffi", lastName: "Mensah", email: "tech@evento.app", passwordHash: await hashPassword("Organizer123"), role: "ORGANIZER", isEmailVerified: true, emailVerified: new Date() },
      { firstName: "Ulrich", lastName: "Nkoulou", email: "user@evento.app", passwordHash: await hashPassword("User12345"), phoneNumber: "+237 690 00 00 00", locale: "fr" },
    ])
    .returning();

  const [o1, o2] = await db
    .insert(organizers)
    .values([
      { userId: org1.id, name: "Douala Live", slug: "douala-live", description: "Concerts et festivals en Afrique centrale.", website: "https://example.com" },
      { userId: org2.id, name: "Kmer Tech Hub", slug: "kmer-tech-hub", description: "Communauté tech et entrepreneuriat." },
    ])
    .returning();

  type Seed = {
    org: string; category: string; title: string; slug: string; city: string; country: string; location: string;
    days: number; hours: number; image: number; featured?: boolean; tz?: string;
    tickets: Array<{ name: string; price: number; quantity: number; currency?: string }>;
  };
  const seeds: Seed[] = [
    { org: o1.id, category: "music", title: "Makossa Night Live", slug: "makossa-night-live", city: "Douala", country: "Cameroun", location: "Palais des Sports", days: 5, hours: 5, image: 36675302, featured: true, tickets: [{ name: "Standard", price: 500000, quantity: 300 }, { name: "VIP", price: 1500000, quantity: 50 }] },
    { org: o1.id, category: "festivals", title: "Festival des Arts Urbains", slug: "festival-arts-urbains", city: "Yaoundé", country: "Cameroun", location: "Boulevard du 20 Mai", days: 12, hours: 10, image: 14870726, featured: true, tickets: [{ name: "Pass 1 jour", price: 300000, quantity: 500 }, { name: "Pass week-end", price: 800000, quantity: 200 }] },
    { org: o2.id, category: "tech", title: "Kmer Dev Summit 2026", slug: "kmer-dev-summit", city: "Douala", country: "Cameroun", location: "Hôtel Sawa", days: 20, hours: 9, image: 716281, featured: true, tickets: [{ name: "Early bird", price: 1000000, quantity: 100 }, { name: "Regular", price: 2000000, quantity: 200 }] },
    { org: o2.id, category: "business", title: "Afrique Startup Forum", slug: "afrique-startup-forum", city: "Abidjan", country: "Côte d’Ivoire", location: "Sofitel Ivoire", days: 30, hours: 8, image: 39680007, tz: "Africa/Abidjan", tickets: [{ name: "Participant", price: 2500000, quantity: 150 }] },
    { org: o1.id, category: "music", title: "Jazz sous les étoiles", slug: "jazz-sous-les-etoiles", city: "Dakar", country: "Sénégal", location: "Institut Français", days: 9, hours: 4, image: 30215324, tz: "Africa/Dakar", tickets: [{ name: "Entrée", price: 1000000, quantity: 120, currency: "XAF" }] },
    { org: o1.id, category: "food", title: "Marché gourmand de Kribi", slug: "marche-gourmand-kribi", city: "Kribi", country: "Cameroun", location: "Plage de Mpalla", days: 3, hours: 8, image: 36774494, tickets: [{ name: "Entrée libre", price: 0, quantity: 400 }] },
    { org: o2.id, category: "conferences", title: "Women in Tech Paris", slug: "women-in-tech-paris", city: "Paris", country: "France", location: "Station F", days: 40, hours: 7, image: 32441077, tz: "Europe/Paris", tickets: [{ name: "Standard", price: 4900, quantity: 250, currency: "EUR" }, { name: "Supporter", price: 9900, quantity: 50, currency: "EUR" }] },
    { org: o1.id, category: "arts", title: "Expo Peinture Contemporaine", slug: "expo-peinture-contemporaine", city: "Yaoundé", country: "Cameroun", location: "Musée National", days: 15, hours: 6, image: 26733617, tickets: [{ name: "Adulte", price: 200000, quantity: 200 }, { name: "Étudiant", price: 100000, quantity: 100 }] },
    { org: o1.id, category: "music", title: "Afrobeats Arena", slug: "afrobeats-arena", city: "Douala", country: "Cameroun", location: "Stade Japoma", days: 25, hours: 5, image: 761543, featured: true, tickets: [{ name: "Pelouse", price: 700000, quantity: 2000 }, { name: "Tribune", price: 1500000, quantity: 500 }] },
    { org: o1.id, category: "music", title: "Soirée Bikutsi (édition passée)", slug: "soiree-bikutsi-passee", city: "Yaoundé", country: "Cameroun", location: "Canal Olympia", days: -10, hours: 4, image: 2990835, tickets: [{ name: "Standard", price: 300000, quantity: 150 }] },
  ];

  const created: Record<string, { id: string; ticketIds: string[] }> = {};
  for (const s of seeds) {
    const [event] = await db
      .insert(events)
      .values({
        organizerId: s.org,
        categoryId: cat(s.category),
        title: s.title,
        slug: s.slug,
        description: `${s.title} — un rendez-vous incontournable à ${s.city}. Venez vivre une expérience unique avec des artistes, des intervenants et une ambiance exceptionnelle.\n\nAccès sur présentation du billet (QR code). Ouverture des portes une heure avant le début.`,
        coverImage: IMG(s.image),
        location: s.location,
        city: s.city,
        country: s.country,
        startDate: at(s.days),
        endDate: new Date(at(s.days).getTime() + s.hours * 3_600_000),
        timezone: s.tz ?? "Africa/Douala",
        status: "published",
        capacity: s.tickets.reduce((a, t) => a + t.quantity, 0),
        isFeatured: s.featured ?? false,
      })
      .returning({ id: events.id });
    const tts = await db
      .insert(ticketTypes)
      .values(s.tickets.map((t) => ({ eventId: event.id, name: t.name, price: t.price, quantity: t.quantity, currency: t.currency ?? "XAF" })))
      .returning({ id: ticketTypes.id });
    created[s.slug] = { id: event.id, ticketIds: tts.map((t) => t.id) };
  }
  await db.insert(eventImages).values([
    { eventId: created["makossa-night-live"].id, url: IMG(30497160), position: 0 },
    { eventId: created["makossa-night-live"].id, url: IMG(12265693), position: 1 },
    { eventId: created["makossa-night-live"].id, url: IMG(20532119), position: 2 },
  ]);

  // A confirmed booking on the past event (lets the demo user review it).
  const past = created["soiree-bikutsi-passee"];
  await db.transaction(async (tx) => {
    const [b] = await tx.insert(bookings).values({ userId: attendee.id, eventId: past.id, status: "pending", subtotal: 600000, fees: 30000, total: 630000, currency: "XAF" }).returning({ id: bookings.id });
    await tx.insert(bookingItems).values({ bookingId: b.id, ticketTypeId: past.ticketIds[0], quantity: 2, unitPrice: 300000, totalPrice: 600000 });
    await tx.update(ticketTypes).set({ soldQuantity: 2 }).where(eqId(past.ticketIds[0]));
    await confirmBookingTx(tx, b.id);
  });
  await db.insert(reviews).values({ userId: attendee.id, eventId: past.id, rating: 5, content: "Ambiance incroyable, organisation au top !" });
  await db.insert(comments).values([
    { userId: attendee.id, eventId: created["makossa-night-live"].id, content: "Hâte d’y être ! Quelqu’un sait si le parking est gratuit ?" },
    { userId: org1.id, eventId: created["makossa-night-live"].id, content: "Oui, parking gratuit sur place. À bientôt !" },
  ]);

  console.info("[seed] done");
  console.info("  admin@evento.app / Admin12345");
  console.info("  organizer@evento.app / Organizer123");
  console.info("  user@evento.app / User12345");
  void admin;
}

function eqId(id: string) {
  return eq(ticketTypes.id, id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
