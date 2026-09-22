import { AppointmentStatus } from "../types";

const STYLES: Record<AppointmentStatus, string> = {
  AGENDADO: "bg-blue-100 text-blue-700",
  CONFIRMADO: "bg-emerald-100 text-emerald-700",
  EM_ATENDIMENTO: "bg-amber-100 text-amber-700",
  REALIZADO: "bg-slate-200 text-slate-700",
  CANCELADO: "bg-red-100 text-red-700",
  REAGENDADO: "bg-purple-100 text-purple-700",
};

const LABELS: Record<AppointmentStatus, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  EM_ATENDIMENTO: "Em atendimento",
  REALIZADO: "Realizado",
  CANCELADO: "Cancelado",
  REAGENDADO: "Reagendado",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
