import bcrypt from "bcryptjs";

process.env.DATABASE_URL ||= "file:./dev.db";

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { name: "Admin User", email: "admin@example.com", passwordHash }
  });

  const member = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: {},
    create: { name: "Member User", email: "member@example.com", passwordHash }
  });

  const project = await prisma.project.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Product Launch",
      description: "Coordinate design, engineering, and go-to-market work.",
      memberships: {
        create: [
          { userId: admin.id, role: "ADMIN" },
          { userId: member.id, role: "MEMBER" }
        ]
      },
      tasks: {
        create: [
          {
            title: "Finalize launch checklist",
            description: "Confirm owners, dates, and acceptance criteria.",
            status: "IN_PROGRESS",
            priority: "HIGH",
            dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
            assigneeId: admin.id,
            creatorId: admin.id
          },
          {
            title: "QA onboarding flow",
            status: "TODO",
            priority: "MEDIUM",
            dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
            assigneeId: member.id,
            creatorId: admin.id
          }
        ]
      }
    }
  });

  console.log(`Seeded ${project.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
