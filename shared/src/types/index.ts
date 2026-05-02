export type { ApiError, ApiResponse, PaginationMeta } from './api-response';

import type { InferSelectModel } from 'drizzle-orm';
import type {
  bookCodes,
  examQuestions,
  examTypes,
  questions,
  questionStatistics,
  studentExamAnswers,
  studentExams,
  studentQuestionProgress,
  units,
  users,
} from '../schema/index';

export type User = InferSelectModel<typeof users>;
export type BookCode = InferSelectModel<typeof bookCodes>;
export type ExamType = InferSelectModel<typeof examTypes>;
export type Unit = InferSelectModel<typeof units>;
export type Question = InferSelectModel<typeof questions>;
export type ExamQuestion = InferSelectModel<typeof examQuestions>;
export type StudentQuestionProgress = InferSelectModel<typeof studentQuestionProgress>;
export type StudentExam = InferSelectModel<typeof studentExams>;
export type StudentExamAnswer = InferSelectModel<typeof studentExamAnswers>;
export type QuestionStatistic = InferSelectModel<typeof questionStatistics>;
