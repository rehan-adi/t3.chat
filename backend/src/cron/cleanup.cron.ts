import { CronJob } from "cron";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";

export const job = new CronJob(
  "*/5 * * * *",
  async function () {
    try {
      const now = new Date();

      const { count } = await prisma.conversation.deleteMany({
        where: {
          isTemporaryChat: true,
          expiresAt: {
            lte: now,
          },
        },
      });

      logger.info(
        {
          count,
          cronTime: now.toISOString(),
          description: "Temporary chat cleanup",
        },
        "Cron executed successfully",
      );
    } catch (error) {
      logger.error({ error }, "Cron failed to delete temporary chats");
    }
  },
  null,
  true,
  "Asia/Kolkata",
);
