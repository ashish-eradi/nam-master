export interface Fund {
  id: string;
  name: string;
  short_name?: string;
  receipt_series_prefix?: string;
  receipt_number_start: number;
  current_receipt_number: number;
  school_id: string;
  installment_type?: string;
}

export interface FundCreate {
  name: string;
  short_name?: string;
  receipt_series_prefix?: string;
  receipt_number_start: number;
  school_id: string;
  installment_type?: string;
}

export interface FundUpdate {
  name?: string;
  short_name?: string;
  receipt_series_prefix?: string;
  receipt_number_start?: number;
  installment_type?: string;
}

export interface Fee {
  id: string;
  fee_name: string;
  fee_short_name?: string;
  fund_id: string;
  school_id: string;
}

export interface FeeCreate {
  fee_name: string;
  fee_short_name?: string;
  fund_id: string;
  school_id: string;
}

export interface FeeUpdate {
  fee_name?: string;
  fee_short_name?: string;
  fund_id?: string;
}

export interface ClassFee {
  id: string;
  fee_id: string;
  class_id: string;
  fee_name?: string;
  amount: number;
  installment_type?: string;
  academic_year: string;
}

export interface Payment {
  id: string;
  receipt_number: string;
  student_id: string;
  fund_id: string;
  payment_date: string;
  amount_paid: number;
  payment_mode: string;
  transaction_id?: string;
  remarks?: string;
  school_id: string;
  received_by_user_id: string;
}

export interface PaymentCreate {
  student_id: string;
  fund_id: string;
  payment_date: string;
  amount_paid: number;
  payment_mode: string;
  transaction_id?: string;
  remarks?: string;
  school_id: string;
  received_by_user_id: string;
}

export interface Concession {
  id: string;
  student_id: string;
  fee_id: string;
  discount_amount?: number;
  discount_percentage?: number;
  reason?: string;
  academic_year: string;
  school_id: string;
  approved_by_user_id: string;
}

export interface ConcessionCreate {
  student_id: string;
  fee_id: string;
  discount_amount?: number;
  discount_percentage?: number;
  reason?: string;
  academic_year: string;
  school_id: string;
  approved_by_user_id: string;
}

export interface Salary {
  id: string;
  teacher_id: string;
  month: string; // YYYY-MM
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_date?: string;
  payment_mode?: string;
  school_id: string;
}

export interface SalaryCreate {
  teacher_id: string;
  month: string; // YYYY-MM
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_date?: string;
  payment_mode?: string;
  school_id: string;
}

// Extended Finance Schema

export interface ClassFeeCreate {
  fee_id: string;
  class_id: string;
  amount: number;
  installment_type?: string;
  academic_year: string;
}

export interface ClassFeeUpdate {
  amount?: number;
  installment_type?: string;
  academic_year?: string;
}

export interface StudentLookup {
  id: string;
  admission_number: string;
  full_name: string;
  class_name: string;
  outstanding_balance: number;
}

export interface TeacherLookup {
  id: string;
  employee_id: string;
  full_name: string;
  department: string;
}

export interface StudentFeeStructure {
  id: string;
  student_id: string;
  class_fee_id: string;
  academic_year: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  amount_paid: number;
  outstanding_amount: number;
}

export interface StudentFeeAssignment {
  academic_year: string;
  create_installments: boolean;
  installment_type?: string;
}

export interface StudentLedger {
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  academic_year: string;
  total_expected: number;
  total_paid: number;
  total_outstanding: number;
  fee_structures: any[];
  payments: any[];
}

export interface StudentOutstanding {
  student_id: string;
  total_outstanding: number;
  by_fee: any[];
  has_overdue: boolean;
  overdue_count: number;
}

export interface PaymentDetailCreate {
  fee_id: string;
  student_fee_structure_id?: string;
  amount: number;
}

export interface PaymentCreateWithAllocations {
  student_id: string;
  fund_id: string;
  payment_date: string;
  amount_paid: number;
  payment_mode: string;
  transaction_id?: string;
  remarks?: string;
  school_id: string;
  payment_details: PaymentDetailCreate[];
}

export interface BulkClassFeeCreate {
  class_fees: ClassFeeCreate[];
}

export interface BulkPaymentRecord {
  student_id: string;
  fund_id: string;
  amount_paid: number;
  payment_mode: string;
  payment_date: string;
  transaction_id?: string;
  remarks?: string;
  auto_allocate: boolean;
}

export interface BulkPaymentCreate {
  school_id: string;
  payments: BulkPaymentRecord[];
}

export interface BulkConcessionCreate {
  fee_id: string;
  discount_amount?: number;
  discount_percentage?: number;
  reason: string;
  academic_year: string;
  school_id: string;
  student_ids?: string[];
  class_ids?: string[];
}
