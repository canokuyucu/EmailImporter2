import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { yetkilerTable } from "./yetkiler";

export const yetkiNotlariTable = pgTable("yetki_notlari", {
  id: serial("id").primaryKey(),
  yetkiId: integer("yetki_id").notNull().references(() => yetkilerTable.id, { onDelete: "cascade" }),
  not: text("not").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type YetkiNot = typeof yetkiNotlariTable.$inferSelect;
