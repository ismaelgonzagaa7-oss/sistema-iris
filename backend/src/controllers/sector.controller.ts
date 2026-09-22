import { Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

export async function listSectors(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const sectors = await prisma.sector.findMany({ orderBy: { name: "asc" } });
    res.json(sectors);
  } catch (err) {
    next(err);
  }
}
