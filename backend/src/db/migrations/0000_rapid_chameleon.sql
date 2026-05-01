CREATE TABLE `question_statistics` (
	`question_id` text PRIMARY KEY NOT NULL,
	`total_attempts` integer DEFAULT 0 NOT NULL,
	`correct_attempts` integer DEFAULT 0 NOT NULL,
	`wrong_attempts` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `book_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`qr_url` text NOT NULL,
	`status` text DEFAULT 'unused' NOT NULL,
	`used_by_user_id` text,
	`used_at` text,
	`expires_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`used_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `book_codes_code_unique` ON `book_codes` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `book_codes_used_by_user_id_unique` ON `book_codes` (`used_by_user_id`);--> statement-breakpoint
CREATE TABLE `exam_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`option1` text NOT NULL,
	`option2` text NOT NULL,
	`option3` text NOT NULL,
	`option4` text NOT NULL,
	`correct_answer` text NOT NULL,
	`short_description` text,
	`difficulty` text NOT NULL,
	`unit_id` text NOT NULL,
	`access_type` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exam_types` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_name` text NOT NULL,
	`tags` text,
	`exam_question_count` integer DEFAULT 10 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_types_exam_name_unique` ON `exam_types` (`exam_name`);--> statement-breakpoint
CREATE TABLE `student_exam_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`question_id` text NOT NULL,
	`selected_answer` text,
	`is_correct` integer DEFAULT false NOT NULL,
	`answered_at` text NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `student_exams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_exam_answers_exam_id_question_id_unique` ON `student_exam_answers` (`exam_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `student_exams` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`difficulty` text NOT NULL,
	`score` integer,
	`total_questions` integer NOT NULL,
	`correct_answers` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` text NOT NULL,
	`submitted_at` text,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_exams_student_id_unit_id_unique` ON `student_exams` (`student_id`,`unit_id`);--> statement-breakpoint
CREATE TABLE `student_question_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`question_id` text NOT NULL,
	`status` text DEFAULT 'answered' NOT NULL,
	`answered_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_question_progress_student_id_question_id_unique` ON `student_question_progress` (`student_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`option1` text NOT NULL,
	`option2` text NOT NULL,
	`option3` text NOT NULL,
	`option4` text NOT NULL,
	`correct_answer` text NOT NULL,
	`description` text,
	`audio_url` text,
	`unit_id` text NOT NULL,
	`access_type` text DEFAULT 'free' NOT NULL,
	`sequence_order` integer NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_name` text NOT NULL,
	`image_url` text,
	`exam_type_id` text NOT NULL,
	`tags` text,
	`access_type` text DEFAULT 'free' NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`exam_type_id`) REFERENCES `exam_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_hash_unique` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`membership_type` text DEFAULT 'normal' NOT NULL,
	`membership_source` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);