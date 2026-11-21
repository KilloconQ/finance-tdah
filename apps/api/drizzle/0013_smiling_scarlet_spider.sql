CREATE TABLE "device_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"environment" text DEFAULT 'production' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "device_token" ADD CONSTRAINT "device_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_token_token_idx" ON "device_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "device_token_user_idx" ON "device_token" USING btree ("user_id");