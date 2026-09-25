import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, organizers } from "@/db/schema";

export async function listTopOrganizers(limit = 6) {
  const rows = await db
    .select({
      id: organizers.id,
      name: organizers.name,
      slug: organizers.slug,
      image: organizers.image,
      description: organizers.description,
      eventCount: sql<number>`count(${events.id}) filter (where ${events.status} = 'published')::int`,
    })
    .from(organizers)
    .leftJoin(events, eq(events.organizerId, organizers.id))
    .groupBy(organizers.id)
    .orderBy(desc(sql`count(${events.id})`))
    .limit(limit);
  return rows.map((r) => ({ ...r, eventCount: Number(r.eventCount) }));
}
