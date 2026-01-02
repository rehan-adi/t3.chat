import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = `${Bun.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter, errorFormat: "pretty" });
