CREATE TABLE `review_bundles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`filename` text NOT NULL,
	`app_name` text NOT NULL,
	`version_label` text NOT NULL,
	`sha256` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`file_count` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `review_bundles_owner_created` ON `review_bundles` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `bundle_review_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`bundle_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`model_reported` text NOT NULL,
	`summary` text NOT NULL,
	`checks_json` text NOT NULL,
	`findings_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bundle_reports_owner_bundle` ON `bundle_review_reports` (`owner_id`,`bundle_id`);