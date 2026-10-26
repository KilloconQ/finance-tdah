CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'declined');--> statement-breakpoint
CREATE TABLE "expense_group_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"invited_by" text NOT NULL,
	"invitee_id" text NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_group_invitation" ADD CONSTRAINT "expense_group_invitation_group_id_expense_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."expense_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_group_invitation" ADD CONSTRAINT "expense_group_invitation_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_group_invitation" ADD CONSTRAINT "expense_group_invitation_invitee_id_user_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expense_group_invitation_idx" ON "expense_group_invitation" USING btree ("group_id","invitee_id");--> statement-breakpoint
CREATE INDEX "expense_group_invitation_invitee_idx" ON "expense_group_invitation" USING btree ("invitee_id");