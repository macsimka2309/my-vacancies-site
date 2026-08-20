import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client.ts";
import { parseSalaryText } from "../lib/salary.ts";
import { vacancySeeds } from "./seed-data.ts";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function main() {
  for (const vacancy of vacancySeeds) {
    // Числа выводим из витринной строки — тем же разбором, что и админка.
    const data = { ...vacancy, ...parseSalaryText(vacancy.salary) };

    await prisma.vacancy.upsert({
      where: {
        slug: vacancy.slug,
      },
      update: data,
      create: data,
    });
  }

  console.log(`Seeded ${vacancySeeds.length} vacancies.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
