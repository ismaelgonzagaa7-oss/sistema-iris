export type UserRole = "ADMIN" | "OPERADOR";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Sector {
  id: string;
  slug: "ADMINISTRATIVO" | "PROCERT";
  name: string;
}

export interface Service {
  id: string;
  sectorId: string;
  name: string;
  active: boolean;
}

export type PersonType = "PF" | "PJ";

export interface Client {
  id: string;
  fullName: string;
  documentId?: string | null;
  personType: PersonType;
  companyName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type Modality = "VIDEOCONFERENCIA" | "PRESENCIAL";

export type AppointmentStatus =
  | "AGENDADO"
  | "CONFIRMADO"
  | "EM_ATENDIMENTO"
  | "REALIZADO"
  | "CANCELADO"
  | "REAGENDADO";

export interface Appointment {
  id: string;
  clientId: string;
  sectorId: string;
  serviceId: string;
  modality: Modality;
  scheduledAt: string;
  durationMin: number;
  notes?: string | null;
  status: AppointmentStatus;
  client: Client;
  sector: Sector;
  service: Service;
}

export interface DashboardSummary {
  indicators: {
    today: number;
    future: number;
    completed: number;
    cancelled: number;
    videoconference: number;
    inPerson: number;
  };
  todayAppointments: Appointment[];
}
