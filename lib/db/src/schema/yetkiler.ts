import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const yetkilerTable = pgTable("yetkiler", {
  id: serial("id").primaryKey(),
  tasinmazNo: text("tasinmaz_no").notNull().unique(),
  ad: text("ad").notNull(),
  bitisTarihi: text("bitis_tarihi"),
  mailTarihi: text("mail_tarihi").notNull(),
  durum: text("durum").notNull(),
  kalanGun: integer("kalan_gun"),
  alert30Sent: boolean("alert_30_sent").default(false).notNull(),
  alert14Sent: boolean("alert_14_sent").default(false).notNull(),
  alert7Sent: boolean("alert_7_sent").default(false).notNull(),
  etiket: text("etiket").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertYetkiSchema = createInsertSchema(yetkilerTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  alert30Sent: true,
  alert14Sent: true,
  alert7Sent: true,
});

export type InsertYetki = z.infer<typeof insertYetkiSchema>;
export type Yetki = typeof yetkilerTable.$inferSelect;
