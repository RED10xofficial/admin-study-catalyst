CREATE TABLE `student_exam_types` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`exam_type_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_type_id`) REFERENCES `exam_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_exam_types_student_id_exam_type_id_unique` ON `student_exam_types` (`student_id`,`exam_type_id`);--> statement-breakpoint
ALTER TABLE `questions` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `units` ADD `unit_slug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `units_unit_slug_unique` ON `units` (`unit_slug`);