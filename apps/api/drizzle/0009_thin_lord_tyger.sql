CREATE TABLE "app_invitation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "app_invitation_log_key_idx" ON "app_invitation_log" USING btree ("scope","key","created_at");--> statement-breakpoint
CREATE INDEX "app_invitation_log_created_idx" ON "app_invitation_log" USING btree ("created_at");