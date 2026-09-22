import { Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

const clientSchema = z.object({
  fullName: z.string().min(2),
  documentId: z.string().optional().nullable(),
  personType: z.enum(["PF", "PJ"]).default("PF"),
  companyName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
});

export async function listClients(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;
    const where = q
      ? {
          OR: [
            { fullName: { contains: String(q), mode: "insensitive" as const } },
            { documentId: { contains: String(q), mode: "insensitive" as const } },
            { phone: { contains: String(q), mode: "insensitive" as const } },
            { companyName: { contains: String(q), mode: "insensitive" as const } },
          ],
        }
      : {};

    const clients = await prisma.client.findMany({
      where,
      orderBy: { fullName: "asc" },
    });
    res.json(clients);
  } catch (err) {
    next(err);
  }
}

export async function getClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client) return res.status(404).json({ error: "Cliente não encontrado." });
    res.json(client);
  } catch (err) {
    next(err);
  }
}

export async function createClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.create({ data: { ...data, email: data.email || null } });
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
}

export async function updateClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = clientSchema.partial().parse(req.body);
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { ...data, email: data.email || undefined },
    });
    res.json(client);
  } catch (err) {
    next(err);
  }
}

export async function deleteClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
