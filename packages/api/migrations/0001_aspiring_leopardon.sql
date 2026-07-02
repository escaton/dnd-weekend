CREATE TABLE "room_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"character_id" uuid,
	"invited_by" uuid,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"game_master_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "room_members_room_id_active_idx" ON "room_members" USING btree ("room_id") WHERE "room_members"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "room_members_email_room_id_active_idx" ON "room_members" USING btree ("email","room_id") WHERE "room_members"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "rooms_game_master_id_active_idx" ON "rooms" USING btree ("game_master_id") WHERE "rooms"."deleted_at" IS NULL;