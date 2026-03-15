export interface Period {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
  school_id: string;
}

export interface TimetableEntry {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  period_id: string;
  day_of_week: number;
  academic_year: string;
  school_id: string;
}
