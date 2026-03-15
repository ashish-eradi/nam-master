
import { z } from 'zod';

export const ClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  section: z.string(),
  grade_level: z.number(),
  school_id: z.string(),
  academic_year: z.string(),
  class_teacher_id: z.string(),
  max_students: z.number(),
});

export const ClassCreateSchema = ClassSchema.omit({ id: true });
export const ClassUpdateSchema = ClassSchema.partial();

export type Class = z.infer<typeof ClassSchema>;
export type ClassCreate = z.infer<typeof ClassCreateSchema>;
export type ClassUpdate = z.infer<typeof ClassUpdateSchema>;
