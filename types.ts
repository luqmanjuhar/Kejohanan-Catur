
export interface Teacher {
  name: string;
  email: string;
  phone: string;
  ic: string;
  position: 'Ketua' | 'Pengiring';
}

export interface Student {
  name: string;
  ic: string;
  gender: 'Lelaki' | 'Perempuan' | '';
  race: string;
  category: string;
  playerId: string;
}

export interface Registration {
  schoolName: string;
  schoolType: string;
  teachers: Teacher[];
  students: Student[];
  createdAt: string;
  updatedAt: string;
  status: string;
  stats?: {
    totalTeachers: number;
    totalStudents: number;
    male: number;
    female: number;
  };
}

export type RegistrationsMap = Record<string, Registration>;

export interface ScheduleItem {
  time: string;
  activity: string;
}

export interface ScheduleDay {
  date: string;
  items: ScheduleItem[];
}

export interface EventConfig {
  eventName: string;
  eventVenue: string;
  adminPhone: string;
  tournamentDate?: string;
  registrationDeadline?: string;
  schedules: {
    primary: ScheduleDay[];
    secondary: ScheduleDay[];
  };
  links: {
    rules: string;
    results: string;
    photos: string;
  };
  documents: {
    invitation: string;
    meeting: string;
    arbiter: string;
  };
}
