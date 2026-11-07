import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@xprime.com" },
    update: {},
    create: {
      email: "admin@xprime.com",
      passwordHash,
      name: "Super Admin",
      role: "ADMIN",
      credits: 999999,
    },
  });
  console.log("✅ Admin Created: admin@xprime.com / admin123");
}
main().finally(() => prisma.$disconnect());