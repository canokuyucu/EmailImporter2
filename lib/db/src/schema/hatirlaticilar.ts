import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const hatirlaticilarTable = pgTable("hatirlaticilar", {
  id: serial("id").primaryKey(),
  yetkiId: integer("yetki_id").notNull(),
  tasinmazNo: text("tasinmaz_no").notNull(),
  ad: text("ad").notNull(),
  tarih: text("tarih").notNull(),
  mesaj: text("mesaj").notNull(),
  gonderildi: boolean("gonderildi").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Hatirlatici = typeof hatirlaticilarTable.$inferSelect;
