import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_ORIGINS = [
  "Google", "Instagram", "Facebook", "WhatsApp", "Indicação",
  "Site", "Campanha", "Feira", "Ligação", "Presencial", "Outro",
];

const DEFAULT_TAGS = [
  { name: "Quente", color: "#ff8900" },
  { name: "Frio", color: "#9ce1ff" },
  { name: "Renovação", color: "#a8c8ff" },
  { name: "VIP", color: "#ffb780" },
  { name: "Indicação", color: "#00cbff" },
];

async function main() {
  console.log("🌱 Iniciando seed...");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@sustentare.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrador",
      fullName: "Administrador Sustentare",
      email: adminEmail,
      username: adminUsername,
      passwordHash,
      role: "ADMIN",
      status: "ATIVO",
      color: "#a8c8ff",
    },
  });
  console.log(`✅ Admin: ${admin.username} / ${adminEmail}`);

  // Dados de demonstração (usuário, funil e clientes de exemplo) só quando SEED_DEMO=true.
  const seedDemo = process.env.SEED_DEMO === "true";

  let consultor = admin;
  if (seedDemo) {
    consultor = await prisma.user.upsert({
      where: { email: "consultor@sustentare.com" },
      update: {},
      create: {
        name: "João",
        lastName: "Consultor",
        fullName: "João Consultor",
        email: "consultor@sustentare.com",
        username: "joao",
        passwordHash: await bcrypt.hash("Joao@123", 10),
        role: "USER",
        status: "ATIVO",
        color: "#00cbff",
      },
    });
  }

  // Origens
  for (const name of DEFAULT_ORIGINS) {
    await prisma.origin.upsert({ where: { name }, update: {}, create: { name } });
  }
  const origemIndicacao = await prisma.origin.findUnique({ where: { name: "Indicação" } });

  // Tags
  for (const t of DEFAULT_TAGS) {
    await prisma.tag.upsert({ where: { name: t.name }, update: {}, create: t });
  }

  // Funil de exemplo (removível — nada é fixo no código)
  const existing = await prisma.funnel.findFirst({ where: { name: "Seguro Auto" } });
  if (seedDemo && !existing) {
    const funnel = await prisma.funnel.create({
      data: {
        name: "Seguro Auto",
        description: "Funil comercial para vendas de seguro automotivo.",
        color: "#00cbff",
        order: 0,
        stages: {
          create: [
            { name: "Novo lead", color: "#a8c8ff", order: 0, defaultMessage: "Olá {nome}! Aqui é da {empresa}. Vi seu interesse em {produto}. Podemos conversar?" },
            { name: "Primeiro contato", color: "#9ce1ff", order: 1, defaultMessage: "Oi {nome}, tudo bem? Vamos avançar com sua cotação de {produto}?" },
            { name: "Cotação enviada", color: "#ffb780", order: 2, defaultMessage: "{nome}, segue sua cotação. Qualquer dúvida estou à disposição!" },
            { name: "Negociação", color: "#ff8900", order: 3 },
            { name: "Fechado", color: "#00cbff", order: 4 },
          ],
        },
      },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    const s = funnel.stages;
    await prisma.client.createMany({
      data: [
        { fullName: "Maria Silva", phone: "51999998888", ddd: "51", whatsapp: "51999998888", city: "Porto Alegre", state: "RS", product: "Seguro Auto", estimatedValue: 1800, status: "ATIVO", funnelId: funnel.id, stageId: s[0].id, responsibleId: consultor.id, originId: origemIndicacao?.id },
        { fullName: "Carlos Souza", phone: "51988887777", ddd: "51", whatsapp: "51988887777", city: "Canoas", state: "RS", product: "Seguro Auto", estimatedValue: 2400, status: "ATIVO", funnelId: funnel.id, stageId: s[1].id, responsibleId: consultor.id },
        { fullName: "Ana Pereira", phone: "51977776666", ddd: "51", whatsapp: "51977776666", city: "Gravataí", state: "RS", product: "Seguro Auto", estimatedValue: 1500, status: "ATIVO", funnelId: funnel.id, stageId: s[2].id, responsibleId: admin.id },
        { fullName: "Pedro Lima", phone: "51966665555", ddd: "51", whatsapp: "51966665555", city: "Porto Alegre", state: "RS", product: "Seguro Auto", estimatedValue: 3200, closedValue: 3000, status: "CONVERTIDO", funnelId: funnel.id, stageId: s[4].id, responsibleId: consultor.id },
      ],
    });

    await prisma.message.create({
      data: {
        title: "Boas-vindas",
        category: "Primeiro contato",
        content: "Olá {nome}! 👋 Aqui é da {empresa}. Recebemos seu contato sobre {produto}. Como posso te ajudar?",
        stageId: s[0].id,
        isDefault: true,
        versions: { create: { content: "Olá {nome}! Aqui é da {empresa}." } },
      },
    });

    console.log("✅ Funil de exemplo 'Seguro Auto' criado com etapas e clientes.");
  }

  await prisma.setting.upsert({
    where: { key: "brand.primaryColor" },
    update: {},
    create: { key: "brand.primaryColor", value: "#00cbff" },
  });

  // Backfill: garante que clientes sem lista fiquem em uma lista inicial.
  const orphanCount = await prisma.client.count({ where: { deletedAt: null, listId: null } });
  if (orphanCount > 0) {
    let list = await prisma.clientList.findFirst({ where: { name: "Clientes iniciais" } });
    if (!list) {
      list = await prisma.clientList.create({
        data: {
          name: "Clientes iniciais",
          source: "MANUAL",
          notes: "Lista criada automaticamente para os clientes de exemplo.",
        },
      });
    }
    await prisma.client.updateMany({
      where: { deletedAt: null, listId: null },
      data: { listId: list.id },
    });
    console.log(`✅ Backfill: ${orphanCount} cliente(s) vinculado(s) à lista "Clientes iniciais".`);
  }

  console.log("🎉 Seed concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
