CREATE TABLE "film_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"film_id" integer NOT NULL,
	"current_stock" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"minimum_stock" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "films" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"cost_per_sqft" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "films_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "installer_time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_entry_id" integer NOT NULL,
	"installer_id" varchar NOT NULL,
	"windows_completed" integer DEFAULT 0 NOT NULL,
	"time_minutes" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"film_id" integer NOT NULL,
	"type" varchar NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"previous_stock" numeric(10, 2) NOT NULL,
	"new_stock" numeric(10, 2) NOT NULL,
	"job_entry_id" integer,
	"notes" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_dimensions" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_entry_id" integer NOT NULL,
	"film_id" integer,
	"length_inches" numeric(8, 2) NOT NULL,
	"width_inches" numeric(8, 2) NOT NULL,
	"sqft" numeric(10, 4) NOT NULL,
	"film_cost" numeric(10, 2),
	"description" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_number" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"vehicle_year" varchar NOT NULL,
	"vehicle_make" varchar NOT NULL,
	"vehicle_model" varchar NOT NULL,
	"total_sqft" real,
	"film_cost" numeric(10, 2),
	"window_assignments" jsonb,
	"total_windows" integer DEFAULT 7 NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"duration_minutes" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "job_entries_job_number_unique" UNIQUE("job_number")
);
--> statement-breakpoint
CREATE TABLE "job_installers" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_entry_id" integer NOT NULL,
	"installer_id" varchar NOT NULL,
	"time_variance" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "redo_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_entry_id" integer NOT NULL,
	"installer_id" varchar NOT NULL,
	"part" varchar NOT NULL,
	"length_inches" real,
	"width_inches" real,
	"sqft" real,
	"film_id" integer,
	"material_cost" numeric(10, 2),
	"time_minutes" integer DEFAULT 0,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"password" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'installer' NOT NULL,
	"hourly_rate" numeric(8, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "film_inventory" ADD CONSTRAINT "film_inventory_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_time_entries" ADD CONSTRAINT "installer_time_entries_job_entry_id_job_entries_id_fk" FOREIGN KEY ("job_entry_id") REFERENCES "public"."job_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installer_time_entries" ADD CONSTRAINT "installer_time_entries_installer_id_users_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_job_entry_id_job_entries_id_fk" FOREIGN KEY ("job_entry_id") REFERENCES "public"."job_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_dimensions" ADD CONSTRAINT "job_dimensions_job_entry_id_job_entries_id_fk" FOREIGN KEY ("job_entry_id") REFERENCES "public"."job_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_dimensions" ADD CONSTRAINT "job_dimensions_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_installers" ADD CONSTRAINT "job_installers_job_entry_id_job_entries_id_fk" FOREIGN KEY ("job_entry_id") REFERENCES "public"."job_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_installers" ADD CONSTRAINT "job_installers_installer_id_users_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redo_entries" ADD CONSTRAINT "redo_entries_job_entry_id_job_entries_id_fk" FOREIGN KEY ("job_entry_id") REFERENCES "public"."job_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redo_entries" ADD CONSTRAINT "redo_entries_installer_id_users_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redo_entries" ADD CONSTRAINT "redo_entries_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "session" USING btree ("expire");