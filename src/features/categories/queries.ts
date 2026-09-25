import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, events } from "@/db/schema";

export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  eventCount: number;
};

export async function listCategories(): Promise<CategoryWithCount[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      image: categories.image,
      eventCount: sql<number>`count(${events.id}) filter (where ${events.status} = 'published' and ${events.endDate} >= now())::int`,
    })
    .from(categories)
    .leftJoin(events, eq(events.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
  return rows.map((r) => ({ ...r, eventCount: Number(r.eventCount) }));
}

export async function listCategoryOptions(): Promise<Array<{ id: string; name: string; slug: string }>> {
  return db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories).orderBy(asc(categories.name));
}
