
import { z } from 'zod';

export const ExamSchema = z.object({
  id: z.string(),
  name: z.string(),
  class_id: z.string(),
  subject_id: z.string(),
  exam_date: z.string(),
  start_time: z.string(),
  duration_minutes: z.number(),
  max_marks: z.number(),
  syllabus: z.string(),
});

export const ExamCreateSchema = ExamSchema.omit({ id: true });
export const ExamUpdateSchema = ExamSchema.partial();

export type Exam = z.infer<typeof ExamSchema>;
export type ExamCreate = z.infer<typeof ExamCreateSchema>;
export type ExamUpdate = z.infer<typeof ExamUpdateSchema>;
