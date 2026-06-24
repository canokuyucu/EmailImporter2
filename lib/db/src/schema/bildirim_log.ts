import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const bildirimLogTable = pgTable("bildirim_log", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  mesaj: text("mesaj").notNull(),
  gonderildiAt: timestamp("gonderildi_at").defaultNow().notNull(),
});

export type BildirimLog = typeof bildirimLogTable.$inferSelect;
