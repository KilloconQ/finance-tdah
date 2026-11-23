CREATE TYPE "public"."client_platform" AS ENUM('web', 'ios');--> statement-breakpoint
CREATE TABLE "billing_entitlement" (
	"user_id" text PRIMARY KEY NOT NULL,
	"active" boolean NOT NULL,
	"product_id" text,
	"store" text,
	"expires_at" timestamp with time zone,
	"last_event_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_onboarding" (
	"user_id" text NOT NULL,
	"platform" "client_platform" NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_onboarding_user_id_platform_pk" PRIMARY KEY("user_id","platform")
);
--> statement-breakpoint
DROP TABLE "signup_invite" CASCADE;--> statement-breakpoint
ALTER TABLE "billing_entitlement" ADD CONSTRAINT "billing_entitlement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Onboarding is per platform now: everyone who finished it so far did it on the web.
INSERT INTO "user_onboarding" ("user_id", "platform") SELECT "user_id", 'web' FROM "user_profile" WHERE "onboarding_completed";
