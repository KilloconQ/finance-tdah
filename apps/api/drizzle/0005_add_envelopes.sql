CREATE TABLE "envelope" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"balance_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "envelope_id" uuid;--> statement-breakpoint
ALTER TABLE "envelope" ADD CONSTRAINT "envelope_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envelope" ADD CONSTRAINT "envelope_account_id_financial_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "envelope_account_idx" ON "envelope" USING btree ("account_id");--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_envelope_id_envelope_id_fk" FOREIGN KEY ("envelope_id") REFERENCES "public"."envelope"("id") ON DELETE set null ON UPDATE no action;