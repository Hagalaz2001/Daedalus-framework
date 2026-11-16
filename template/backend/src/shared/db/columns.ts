import { timestamp, uuid } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

export { uuidv7 };

/** Primary key: UUIDv7 (time-ordered, so `ORDER BY id` is creation order and cursors need only the id). */
export const id = () => uuid("id").primaryKey().$defaultFn(() => uuidv7());

const tz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const createdAt = () => tz("created_at").notNull().defaultNow();
export const updatedAt = () => tz("updated_at").notNull().defaultNow().$onUpdate(() => new Date());
export const deletedAt = () => tz("deleted_at");
export const timestamptz = tz;
