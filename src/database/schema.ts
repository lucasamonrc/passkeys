import { text, sqliteTable, integer, blob } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
});

export const credentials = sqliteTable("credentials", {
  id: text("id").primaryKey().notNull(),
  credentialPublicKey: blob("credentialPublicKey").notNull(),
  counter: integer("counter").notNull(),
  transports: blob("transports"),
  userId: text("userId").references(() => users.id),
});

export const challenges = sqliteTable("challenges", {
  value: text("value").primaryKey().notNull(),
  userId: text("userId").references(() => users.id),
});
