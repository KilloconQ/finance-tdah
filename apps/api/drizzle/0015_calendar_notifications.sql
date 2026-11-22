CREATE TABLE "calendar_alert" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"source_id" text NOT NULL,
	"event_date" date NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_alert_user_id_kind_source_id_event_date_pk" PRIMARY KEY("user_id","kind","source_id","event_date")
);
--> statement-breakpoint
CREATE TABLE "notification_rule" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"enabled" boolean NOT NULL,
	"days_before" integer NOT NULL,
	"hour" integer NOT NULL,
	CONSTRAINT "notification_rule_user_id_kind_pk" PRIMARY KEY("user_id","kind")
);
--> statement-breakpoint
ALTER TABLE "calendar_alert" ADD CONSTRAINT "calendar_alert_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_rule" ADD CONSTRAINT "notification_rule_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;