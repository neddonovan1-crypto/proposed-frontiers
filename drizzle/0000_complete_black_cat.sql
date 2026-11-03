CREATE TABLE `league` (
	`player_key` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`score` integer NOT NULL,
	`peace` integer NOT NULL,
	`durability` integer NOT NULL,
	`cooperation` integer NOT NULL,
	`edition` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `league_score_idx` ON `league` (`score`);