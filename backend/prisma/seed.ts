import { PrismaClient, SectorSlug, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Setores
  const administrativo = await prisma.sector.upsert({
    where: { slug: SectorSlug.ADMINISTRATIVO },
    update: {},
    create: { slug: SectorSlug.ADMINISTRATIVO, name: "Administrativo" },
  });

  const procert = await prisma.sector.upsert({
    where: { slug: SectorSlug.PROCERT },
    update: {},
    create: { slug: SectorSlug.PROCERT, name: "ProCert Certificadora" },
  });

  // Serviços padrão da ProCert
  const procertServices = [
    "Certificado A1 Pessoa Física",
    "Certificado A1 Pessoa Jurídica",
    "Certificado A3 Pessoa Física",
    "Certificado A3 Pessoa Jurídica",
    "Renovação de certificado",
    "Emissão de certificado",
    "Outro",
  ];

  for (const name of procertServices) {
    const exists = await prisma.service.findFirst({
      where: { name, sectorId: procert.id },
    });
    if (!exists) {
      await prisma.service.create({
        data: { name, sectorId: procert.id },
      });
    }
  }

  // Serviço genérico inicial do Administrativo (usuário pode cadastrar outros)
  const adminServiceExists = await prisma.service.findFirst({
    where: { name: "Atendimento administrativo", sectorId: administrativo.id },
  });
  if (!adminServiceExists) {
    await prisma.service.create({
      data: { name: "Atendimento administrativo", sectorId: administrativo.id },
    });
  }

  // Usuário admin padrão
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@iris.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "TrocarSenha123!";

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        name: "Administrador",
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log(`Usuário admin criado: ${adminEmail} / senha: ${adminPassword} (TROQUE DEPOIS)`);
  }

  // Configurações padrão de horário (usadas na validação de conflito)
  await prisma.systemSetting.upsert({
    where: { key: "business_hours" },
    update: {},
    create: {
      key: "business_hours",
      value: {
        timezone: "America/Sao_Paulo",
        days: [1, 2, 3, 4, 5], // segunda a sexta
        ranges: [
          { start: "09:00", end: "12:00" },
          { start: "13:00", end: "18:00" },
        ],
      },
    },
  });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
