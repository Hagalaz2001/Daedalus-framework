import { boolean, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../../shared/db/columns.ts";

/** One row per flag. `rollout_percent` below 100 turns the flag on for a stable share of users. */
export const featureFlags = pgTable("feature_flags", {
  id: id(),
  key: text("key").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  rolloutPercent: integer("rollout_percent").notNull().default(100),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("feature_flags_key_idx").on(t.key)]);
