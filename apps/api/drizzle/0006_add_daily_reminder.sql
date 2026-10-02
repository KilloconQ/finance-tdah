ALTER TABLE "user_profile" ADD COLUMN "daily_reminder_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "daily_reminder_hour" integer DEFAULT 21 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "time_zone" text DEFAULT 'America/Mexico_City' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "last_daily_reminder_on" date;