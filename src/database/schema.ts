import { text, sqliteTable, integer, blob } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
});

export const credentials = sqliteTable("credentials", {
  id: text("id").primaryKey().notNull(),
  bytes: blob("bytes").notNull(),
  userId: integer("userId").references(() => users.id),
});
