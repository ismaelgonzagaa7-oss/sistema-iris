import { DateTime } from "luxon";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppointmentStatus } from "@prisma/client";

interface BusinessHoursRange {
  start: string; // "09:00"
  end: string; // "12:00"
}

interface BusinessHoursConfig {
  timezone: string;
  days: number[]; // 1 (segunda) .. 7 (domingo), padrão luxon usa 1-7
  ranges: BusinessHoursRange[];
}

const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  timezone: env.timezone,
  days: [1, 2, 3, 4, 5],
  ranges: [
    { start: "09:00", end: "12:00" },
    { start: "13:00", end: "18:00" },
  ],
};

export class ScheduleConflictError extends Error {
  status = 409;
  constructor(message = "Já existe um atendimento agendado para este horário.") {
    super(message);
  }
}

export class OutsideBusinessHoursError extends Error {
  status = 422;
  constructor(message = "Horário fora do período de atendimento configurado.") {
    super(message);
  }
}

async function getBusinessHours(): Promise<BusinessHoursConfig> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "business_hours" } });
  if (!setting) return DEFAULT_BUSINESS_HOURS;
  return setting.value as unknown as BusinessHoursConfig;
}

export function isWithinBusinessHours(scheduledAt: Date, config: BusinessHoursConfig): boolean {
  const dt = DateTime.fromJSDate(scheduledAt, { zone: config.timezone });
  if (!config.days.includes(dt.weekday)) return false;

  const timeStr = dt.toFormat("HH:mm");
  return config.ranges.some((range) => timeStr >= range.start && timeStr < range.end);
}

/**
 * Verifica se o horário está livre e dentro do expediente (salvo override do admin).
 * Lança ScheduleConflictError ou OutsideBusinessHoursError quando aplicável.
 */
export async function validateAppointmentSlot(params: {
  scheduledAt: Date;
  durationMin: number;
  sectorId: string;
  excludeAppointmentId?: string;
  allowOutsideBusinessHours?: boolean;
}): Promise<void> {
  const { scheduledAt, durationMin, sectorId, excludeAppointmentId, allowOutsideBusinessHours } = params;

  if (!allowOutsideBusinessHours) {
    const businessHours = await getBusinessHours();
    if (!isWithinBusinessHours(scheduledAt, businessHours)) {
      throw new OutsideBusinessHoursError();
    }
  }

  const start = scheduledAt;
  const end = new Date(scheduledAt.getTime() + durationMin * 60_000);

  // Verificação de sobreposição (start2 < end1 && start1 < end2), por setor
  const candidates = await prisma.appointment.findMany({
    where: {
      sectorId,
      status: { notIn: [AppointmentStatus.CANCELADO] },
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
    },
    select: { id: true, scheduledAt: true, durationMin: true },
  });

  const hasOverlap = candidates.some((c) => {
    const cStart = c.scheduledAt.getTime();
    const cEnd = cStart + c.durationMin * 60_000;
    return start.getTime() < cEnd && cStart < end.getTime();
  });

  if (hasOverlap) {
    throw new ScheduleConflictError();
  }
}
