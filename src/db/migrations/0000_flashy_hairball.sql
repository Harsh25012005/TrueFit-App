CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`book_no` text,
	`area` text,
	`family_root_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `customers_sync_idx` ON `customers` (`shop_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX `customers_phone_idx` ON `customers` (`shop_id`,`phone`);--> statement-breakpoint
CREATE INDEX `customers_book_no_idx` ON `customers` (`shop_id`,`book_no`) WHERE "customers"."book_no" is not null and "customers"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`shop_id`,`name`) WHERE "customers"."deleted_at" is null;--> statement-breakpoint
CREATE TABLE `garment_types` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`style_options` text DEFAULT '{}' NOT NULL,
	`fabric_per_piece_m` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `garment_types_shop_name_key` ON `garment_types` (`shop_id`,lower("name")) WHERE "garment_types"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `garment_types_sync_idx` ON `garment_types` (`shop_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE TABLE `measurement_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`garment_type_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`garment_type_id`) REFERENCES `garment_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `measurement_fields_garment_name_key` ON `measurement_fields` (`garment_type_id`,lower("name")) WHERE "measurement_fields"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `measurement_fields_order_idx` ON `measurement_fields` (`garment_type_id`,`sort_order`) WHERE "measurement_fields"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `measurement_fields_sync_idx` ON `measurement_fields` (`shop_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE TABLE `measurement_values` (
	`measurement_id` text NOT NULL,
	`field_id` text NOT NULL,
	`shop_id` text NOT NULL,
	`value_in` real NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	PRIMARY KEY(`measurement_id`, `field_id`),
	FOREIGN KEY (`measurement_id`) REFERENCES `measurements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`) REFERENCES `measurement_fields`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "measurement_values_range" CHECK("measurement_values"."value_in" > 0 and "measurement_values"."value_in" <= 999.99)
);
--> statement-breakpoint
CREATE INDEX `measurement_values_sync_idx` ON `measurement_values` (`shop_id`,`updated_at`,`measurement_id`,`field_id`);--> statement-breakpoint
CREATE TABLE `measurement_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`measurement_id` text NOT NULL,
	`values` text NOT NULL,
	`notes` text,
	`measured_on` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`measurement_id`) REFERENCES `measurements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `measurement_versions_measurement_idx` ON `measurement_versions` (`measurement_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `measurement_versions_sync_idx` ON `measurement_versions` (`shop_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`garment_type_id` text NOT NULL,
	`notes` text,
	`measured_on` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`garment_type_id`) REFERENCES `garment_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `measurements_current_key` ON `measurements` (`customer_id`,`garment_type_id`) WHERE "measurements"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `measurements_sync_idx` ON `measurements` (`shop_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE TABLE `order_extras` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`order_id` text NOT NULL,
	`label` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "order_extras_amount" CHECK("order_extras"."amount" between 1 and 200000)
);
--> statement-breakpoint
CREATE INDEX `order_extras_order_idx` ON `order_extras` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_extras_sync_idx` ON `order_extras` (`shop_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`order_id` text NOT NULL,
	`garment_type_id` text NOT NULL,
	`qty` integer NOT NULL,
	`rate` integer NOT NULL,
	`styles` text DEFAULT '{}' NOT NULL,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`garment_type_id`) REFERENCES `garment_types`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "order_items_qty" CHECK("order_items"."qty" between 1 and 50),
	CONSTRAINT "order_items_rate" CHECK("order_items"."rate" between 0 and 200000)
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_sync_idx` ON `order_items` (`shop_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`order_no` integer NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`order_date` text NOT NULL,
	`due_date` text NOT NULL,
	`is_urgent` integer DEFAULT false NOT NULL,
	`notes` text,
	`discount` integer DEFAULT 0 NOT NULL,
	`gst_rate` integer DEFAULT 0 NOT NULL,
	`ready_on` text,
	`delivered_on` text,
	`cancelled_at` text,
	`cancel_reason` text,
	`created_via` text DEFAULT 'app' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "orders_status_check" CHECK(status in ('received', 'ready', 'delivered')),
	CONSTRAINT "orders_due_after_order" CHECK("orders"."due_date" >= "orders"."order_date"),
	CONSTRAINT "orders_delivered_on_matches_status" CHECK(("orders"."status" = 'delivered') = ("orders"."delivered_on" is not null))
);
--> statement-breakpoint
CREATE INDEX `orders_shop_order_no_idx` ON `orders` (`shop_id`,`order_no`);--> statement-breakpoint
CREATE INDEX `orders_sync_idx` ON `orders` (`shop_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX `orders_active_idx` ON `orders` (`shop_id`,`status`,`due_date`) WHERE "orders"."deleted_at" is null and "orders"."cancelled_at" is null;--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`,`order_date`) WHERE "orders"."deleted_at" is null;--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "outbox_op_check" CHECK("outbox"."op" in ('upsert'))
);
--> statement-breakpoint
CREATE INDEX `outbox_created_idx` ON `outbox` (`created_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`order_id` text NOT NULL,
	`amount` integer NOT NULL,
	`mode` text DEFAULT 'cash' NOT NULL,
	`paid_on` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "payments_amount" CHECK("payments"."amount" <> 0 and abs("payments"."amount") <= 1000000),
	CONSTRAINT "payments_mode_check" CHECK(mode in ('cash', 'upi', 'card'))
);
--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `payments_paid_on_idx` ON `payments` (`shop_id`,`paid_on`);--> statement-breakpoint
CREATE INDEX `payments_sync_idx` ON `payments` (`shop_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`language` text DEFAULT 'en' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "profiles_language_check" CHECK(language in ('en', 'gu', 'hi'))
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`gstin` text,
	`upi_id` text,
	`default_gst_rate` integer DEFAULT 0 NOT NULL,
	`measurement_unit` text DEFAULT 'in' NOT NULL,
	`weekly_off_day` integer,
	`next_order_no` integer DEFAULT 1001 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "shops_gst_check" CHECK("shops"."default_gst_rate" in (0, 5, 12, 18)),
	CONSTRAINT "shops_unit_check" CHECK(measurement_unit in ('in', 'cm'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shops_owner_id_unique` ON `shops` (`owner_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`plan` text DEFAULT 'trial' NOT NULL,
	`status` text DEFAULT 'trialing' NOT NULL,
	`trial_ends_at` text NOT NULL,
	`current_period_end` text,
	`provider` text DEFAULT 'revenuecat' NOT NULL,
	`provider_customer_id` text,
	`last_event_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "subscriptions_plan_check" CHECK(plan in ('trial', 'pro_monthly', 'pro_yearly')),
	CONSTRAINT "subscriptions_status_check" CHECK(status in ('trialing', 'active', 'grace', 'expired', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_shop_id_unique` ON `subscriptions` (`shop_id`);--> statement-breakpoint
CREATE TABLE `sync_cursors` (
	`table_name` text PRIMARY KEY NOT NULL,
	`cursor_updated_at` text NOT NULL,
	`cursor_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
