
export interface Teacher {
  name: string;
  email: string;
  phone: string;
  ic: string;
  position: 'Ketua' | 'Pengiring';
}

export interface StudentDocuments {
  hasForm?: boolean; // R01 for primary, M01 for secondary
  hasIdDoc?: boolean; // MyKid/Surat Beranak for primary, IC/Passport for secondary
  hasParentConsent?: boolean; // Surat Kebenaran Ibu Bapa / Penjaga Menyertai Kejohanan
  hasMediaConsent?: boolean; // Surat Akuan Kebenaran Penyiaran Media (Gambar/Audio/Video)
}

export interface Student {
  name: string;
  ic: string;
  gender: 'Lelaki' | 'Perempuan' | '';
  race: string;
  category: string;
  playerId: string;
  isNonCitizen?: boolean;
  documents?: StudentDocuments;
}

export interface Registration {
  schoolName: string;
  schoolCode: string;
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
  // Dokumen Berasingan Sekolah
  docFormUrl?: string; // Borang R01 / M01
  docFormFileName?: string;
  docIdUrl?: string; // Salinan Kad Pengenalan / MyKid
  docIdFileName?: string;
  docParentConsentUrl?: string; // Surat Kebenaran Menyertai Kejohanan
  docParentConsentFileName?: string;
  docMediaConsentUrl?: string; // Surat Kebenaran Media (Gambar / Video)
  docMediaConsentFileName?: string;

  // Backward compatibility atau pautan umum
  documentUrl?: string;
  documentFileName?: string;
  documentStatus?: 'BELUM HANTAR' | 'SEBAHAGIAN' | 'DIHANTAR' | 'LENGKAP' | 'PERLU PEMBETULAN';
  documentUploadedAt?: string;
  adminNotes?: string;
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

export interface ECertField {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  show: boolean;
  fontFamily?: string;
  maxWidth?: number;
}

export interface ECertTemplate {
  id: string;
  name: string;
  backgroundUrl: string;
  orientation?: 'landscape' | 'portrait';
  fields: {
    name: ECertField;
    ic: ECertField;
    school: ECertField;
    category: ECertField;
  };
}

export interface EventConfig {
  eventName: string;
  eventVenue: string;
  adminPhone: string;
  tournamentDate?: string;
  registrationDeadline?: string;
  paymentDeadline?: string;
  isRegistrationOpen?: boolean;
  isUpdateOpen?: boolean;
  isPrintOpen?: boolean;
  isEcertOpen?: boolean;
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
    borangR01?: string;
    borangM01?: string;
    kebenaranKejohanan?: string;
    kebenaranMedia?: string;
  };
  ecertTemplates?: ECertTemplate[];
}
