CREATE TABLE `journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`destination` text NOT NULL,
	`lat` real,
	`lon` real,
	`updated` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user` text PRIMARY KEY NOT NULL,
	`saved` text DEFAULT '[]' NOT NULL
);
