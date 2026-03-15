export interface Hostel {
  id: string;
  name: string;
  hostel_type: string;
  warden_name?: string;
  warden_phone?: string;
  school_id: string;
  total_rooms: number;
}

export interface HostelRoom {
  id: string;
  hostel_id: string;
  room_number: string;
  capacity: number;
  occupied_count: number;
}

export interface HostelAllocation {
  id: string;
  student_id: string;
  room_id: string;
  allocation_date: string;
  academic_year: string;
  status: string;
}
