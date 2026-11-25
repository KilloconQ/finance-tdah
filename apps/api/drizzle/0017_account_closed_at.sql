DROP INDEX "financial_account_user_name_idx";--> statement-breakpoint
ALTER TABLE "financial_account" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_account_user_name_idx" ON "financial_account" USING btree ("user_id","name") WHERE "financial_account"."closed_at" is null;