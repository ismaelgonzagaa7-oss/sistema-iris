import { Response, NextFunction } from "express";
import { z } from "zod";
import { DateTime } from "luxon";
import { AppointmentStatus, WhatsAppMessageType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AuthenticatedRequest } from "../middleware/auth";
import { validateAppointmentSlot } from "../services/appointment.service";
import { whatsAppService } from "../services/whatsapp.service";
import { logAudit } from "../services/audit.service";

const createSchema = z.object({
  clientId: z.string().uuid(),
  sectorId: z.string().uuid(),
  serviceId: z.string().uuid(),
  modality: z.enum(["VIDEOCONFERENCIA", "PRESENCIAL"]),
  scheduledAt: z.string(), // ISO string vindo do frontend já em UTC
  durationMin: z.number().int().positive().default(30),
  notes: z.string().optional().nullable(),
  allowOutsideBusinessHours: z.boolean().optional(),
});

function formatDateTime(date: Date) {
  const dt = DateTime.fromJSDate(date, { zone: env.timezone });
  return { dateStr: dt.toFormat("dd/MM/yyyy"), timeStr: dt.toFormat("HH:mm") };
}

async function notifyAdmin(body: string, type: WhatsAppMessageType, appointmentId?: string) {
  if (!env.whatsapp.recipientPhone) return;
  await whatsAppService.sendText({ to: env.whatsapp.recipientPhone, body, type, appointmentId });
}

export async function listAppointments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { date, from, to, sectorId, status } = req.query;

    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    if (date) {
      const day = DateTime.fromISO(String(date), { zone: env.timezone });
      dateFilter = { gte: day.startOf("day").toJSDate(), lte: day.endOf("day").toJSDate() };
    } else if (from || to) {
      dateFilter = {
        gte: from ? DateTime.fromISO(String(from), { zone: env.timezone }).startOf("day").toJSDate() : undefined,
        lte: to ? DateTime.fromISO(String(to), { zone: env.timezone }).endOf("day").toJSDate() : undefined,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledAt: dateFilter,
        sectorId: sectorId ? String(sectorId) : undefined,
        status: status ? (String(status) as AppointmentStatus) : undefined,
      },
      include: { client: true, sector: true, service: true },
      orderBy: { scheduledAt: "asc" },
    });

    res.json(appointments);
  } catch (err) {
    next(err);
  }
}

export async function getAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { client: true, sector: true, service: true, statusHistory: true, whatsappMessages: true },
    });
    if (!appointment) return res.status(404).json({ error: "Agendamento não encontrado." });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function createAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const scheduledAt = new Date(data.scheduledAt);

    await validateAppointmentSlot({
      scheduledAt,
      durationMin: data.durationMin,
      sectorId: data.sectorId,
      allowOutsideBusinessHours: req.user?.role === "ADMIN" ? data.allowOutsideBusinessHours : false,
    });

    const appointment = await prisma.appointment.create({
      data: {
        clientId: data.clientId,
        sectorId: data.sectorId,
        serviceId: data.serviceId,
        modality: data.modality,
        scheduledAt,
        durationMin: data.durationMin,
        notes: data.notes,
        createdById: req.user?.userId,
      },
      include: { client: true, sector: true, service: true },
    });

    await prisma.appointmentStatusHistory.create({
      data: {
        appointmentId: appointment.id,
        userId: req.user?.userId,
        newStatus: AppointmentStatus.AGENDADO,
        note: "Agendamento criado.",
      },
    });

    await logAudit({ userId: req.user?.userId, action: "CREATE", entity: "Appointment", entityId: appointment.id });

    const { dateStr, timeStr } = formatDateTime(appointment.scheduledAt);
    const body = whatsAppService.buildNewAppointmentMessage({
      clientName: appointment.client.fullName,
      companyName: appointment.client.companyName,
      serviceName: appointment.service.name,
      sectorName: appointment.sector.name,
      dateStr,
      timeStr,
      modality: appointment.modality,
      status: appointment.status,
      notes: appointment.notes,
    });
    await notifyAdmin(body, WhatsAppMessageType.NOVO_AGENDAMENTO, appointment.id);

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
}

const updateStatusSchema = z.object({
  reason: z.string().optional(),
});

export async function confirmAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const appointment = await changeStatus(req.params.id, AppointmentStatus.CONFIRMADO, req.user?.userId);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function startAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const appointment = await changeStatus(req.params.id, AppointmentStatus.EM_ATENDIMENTO, req.user?.userId);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function completeAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        status: AppointmentStatus.REALIZADO,
        completedAt: new Date(),
        completedBy: req.user?.userId,
      },
    });
    await prisma.appointmentStatusHistory.create({
      data: {
        appointmentId: appointment.id,
        userId: req.user?.userId,
        previousStatus: appointment.status,
        newStatus: AppointmentStatus.REALIZADO,
        note: "Atendimento realizado.",
      },
    });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function cancelAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { reason } = updateStatusSchema.parse(req.body);
    const existing = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { client: true, service: true },
    });
    if (!existing) return res.status(404).json({ error: "Agendamento não encontrado." });

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: AppointmentStatus.CANCELADO, cancelReason: reason },
    });

    await prisma.appointmentStatusHistory.create({
      data: {
        appointmentId: appointment.id,
        userId: req.user?.userId,
        previousStatus: existing.status,
        newStatus: AppointmentStatus.CANCELADO,
        note: reason || "Agendamento cancelado.",
      },
    });

    const { dateStr, timeStr } = formatDateTime(existing.scheduledAt);
    const body = whatsAppService.buildCancelMessage({
      clientName: existing.client.fullName,
      serviceName: existing.service.name,
      dateStr,
      timeStr,
      reason,
    });
    await notifyAdmin(body, WhatsAppMessageType.CANCELAMENTO, appointment.id);

    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

const rescheduleSchema = z.object({
  scheduledAt: z.string(),
  allowOutsideBusinessHours: z.boolean().optional(),
});

export async function rescheduleAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { scheduledAt, allowOutsideBusinessHours } = rescheduleSchema.parse(req.body);
    const newDate = new Date(scheduledAt);

    const existing = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { client: true, service: true, sector: true },
    });
    if (!existing) return res.status(404).json({ error: "Agendamento não encontrado." });

    await validateAppointmentSlot({
      scheduledAt: newDate,
      durationMin: existing.durationMin,
      sectorId: existing.sectorId,
      excludeAppointmentId: existing.id,
      allowOutsideBusinessHours: req.user?.role === "ADMIN" ? allowOutsideBusinessHours : false,
    });

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { scheduledAt: newDate, status: AppointmentStatus.REAGENDADO },
    });

    await prisma.appointmentStatusHistory.create({
      data: {
        appointmentId: appointment.id,
        userId: req.user?.userId,
        previousStatus: existing.status,
        newStatus: AppointmentStatus.REAGENDADO,
        note: "Agendamento reagendado.",
      },
    });

    const { dateStr, timeStr } = formatDateTime(newDate);
    const body = whatsAppService.buildRescheduleMessage({
      clientName: existing.client.fullName,
      dateStr,
      timeStr,
      serviceName: existing.service.name,
      modality: existing.modality,
    });
    await notifyAdmin(body, WhatsAppMessageType.REAGENDAMENTO, appointment.id);

    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

async function changeStatus(id: string, newStatus: AppointmentStatus, userId?: string) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    const error: any = new Error("Agendamento não encontrado.");
    error.status = 404;
    throw error;
  }

  const appointment = await prisma.appointment.update({ where: { id }, data: { status: newStatus } });

  await prisma.appointmentStatusHistory.create({
    data: {
      appointmentId: id,
      userId,
      previousStatus: existing.status,
      newStatus,
    },
  });

  return appointment;
}
