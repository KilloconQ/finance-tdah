CREATE TYPE "public"."income_frequency" AS ENUM('once', 'weekly', 'biweekly', 'semimonthly', 'monthly');--> statement-breakpoint
CREATE TABLE "scheduled_income" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"amount_cents" integer,
	"frequency" "income_frequency" NOT NULL,
	"starts_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_income" ADD CONSTRAINT "scheduled_income_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;