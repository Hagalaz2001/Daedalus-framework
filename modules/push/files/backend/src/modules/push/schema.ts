import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "../../shared/db/auth-schema.ts";
import { createdAt, id } from "../../shared/db/columns.ts";

/** One row per signed-in device. A token belongs to one user at a time (signing in elsewhere moves it). */
export const pushTokens = pgTable("push_tokens", {
  id: id(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: ["expo", "fcm", "web"] }).notNull(),
  token: text("token").notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("push_tokens_token_idx").on(t.token), index("push_tokens_user_idx").on(t.userId)]);
