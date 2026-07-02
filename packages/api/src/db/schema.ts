import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const characters = pgTable(
  "characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    content: jsonb("content").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("characters_user_id_active_idx")
      .on(table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    gameMasterId: uuid("game_master_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("rooms_game_master_id_active_idx")
      .on(table.gameMasterId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const roomMembers = pgTable(
  "room_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id").notNull(),
    userId: uuid("user_id"),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull(),
    characterId: uuid("character_id"),
    invitedBy: uuid("invited_by"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("room_members_room_id_active_idx")
      .on(table.roomId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("room_members_email_room_id_active_idx")
      .on(table.email, table.roomId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);
