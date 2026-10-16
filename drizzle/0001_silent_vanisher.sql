CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created` integer NOT NULL,
	`photo` blob,
	`photo_type` text,
	`photo_updated` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE TABLE `auth_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notice_reads` (
	`user_id` text NOT NULL,
	`notice_id` text NOT NULL,
	`seen` integer NOT NULL,
	PRIMARY KEY(`user_id`, `notice_id`),
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`notice_id`) REFERENCES `service_notices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notice_sources` (
	`agency` text PRIMARY KEY NOT NULL,
	`attempt` integer NOT NULL,
	`success` integer,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `service_notices` (
	`id` text PRIMARY KEY NOT NULL,
	`agency` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`url` text NOT NULL,
	`detected` integer NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_routes` (
	`user_id` text PRIMARY KEY NOT NULL,
	`routes` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
