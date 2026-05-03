/**
 * Difficulty tiers for exam bank questions (`exam_questions`) and student exam
 * sessions (`student_exams`).
 */
export enum QuestionDifficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
}

/** Tuple for Drizzle SQLite `text(..., { enum })` column definitions. */
export const QUESTION_DIFFICULTY_VALUES = [
  QuestionDifficulty.Easy,
  QuestionDifficulty.Medium,
  QuestionDifficulty.Hard,
] as const;

export type QuestionDifficultyValue = (typeof QUESTION_DIFFICULTY_VALUES)[number];
