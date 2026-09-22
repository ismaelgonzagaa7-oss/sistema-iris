import { Response, NextFunction } from "express";
import { DateTime } from "luxon";
import { AppointmentStatus, Modality } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AuthenticatedRequest } from "../middleware/auth";

export async function dashboardSummary(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const today = DateTime.now().setZone(env.timezone);
    const startOfDay = today.startOf("day").toJSDate();
    const endOfDay = today.endOf("day").toJSDate();

    const [
      todayCount,
      futureCount,
      completedCount,
      cancelledCount,
      videoCount,
      inPersonCount,
      todayAppointments,
    ] = await Promise.all([
      prisma.appointment.count({ where: { scheduledAt: { gte: startOfDay, lte: endOfDay } } }),
      prisma.appointment.count({
        where: { scheduledAt: { gt: endOfDay }, status: { notIn: [AppointmentStatus.CANCELADO] } },
      }),
      prisma.appointment.count({ where: { status: AppointmentStatus.REALIZADO } }),
      prisma.appointment.count({ where: { status: AppointmentStatus.CANCELADO } }),
      prisma.appointment.count({ where: { modality: Modality.VIDEOCONFERENCIA } }),
      prisma.appointment.count({ where: { modality: Modality.PRESENCIAL } }),
      prisma.appointment.findMany({
        where: { scheduledAt: { gte: startOfDay, lte: endOfDay } },
        include: { client: true, sector: true, service: true },
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

    res.json({
      indicators: {
        today: todayCount,
        future: futureCount,
        completed: completedCount,
        cancelled: cancelledCount,
        videoconference: videoCount,
        inPerson: inPersonCount,
      },
      todayAppointments,
    });
  } catch (err) {
    next(err);
  }
}
