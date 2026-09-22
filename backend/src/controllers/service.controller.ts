import { Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

const serviceSchema = z.object({
  sectorId: z.string().uuid(),
  name: z.string().min(2),
  active: z.boolean().optional(),
});

export async function listServices(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { sectorId } = req.query;
    const services = await prisma.service.findMany({
      where: {
        sectorId: sectorId ? String(sectorId) : undefined,
        active: true,
      },
      orderBy: { name: "asc" },
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
}

export async function createService(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = serviceSchema.parse(req.body);
    const service = await prisma.service.create({ data });
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
}

export async function updateService(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = serviceSchema.partial().parse(req.body);
    const service = await prisma.service.update({ where: { id: req.params.id }, data });
    res.json(service);
  } catch (err) {
    next(err);
  }
}
