export interface Book {
  id: string;
  isbn?: string;
  title: string;
  author?: string;
  publisher?: string;
  publication_year?: number;
  category?: string;
  total_copies: number;
  available_copies: number;
  school_id: string;
}

export interface BookTransaction {
  id: string;
  book_id: string;
  student_id: string;
  checkout_date: string;
  due_date: string;
  return_date?: string;
  fine_amount: number;
  status: string;
  school_id: string;
  issued_by_user_id: string;
}
