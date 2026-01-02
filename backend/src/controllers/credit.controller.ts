import type { Context } from "hono";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { isSameDayUTC, isSameMonthUTC } from "@/utils/dateChecker";

/**
 * @desc checkCredits is for reset daily and monthly credits for premium and free users.
 * On home page frontend will call /check-credits api which will do the job of reseting credits.
 * No cron job or over-engineering, just a simple solution (for now).
 * @param c Hono Context
 * @returns Json Response with data
 */

type updatedDataType = {
  credits?: number;
  lastDailyReset?: Date;
  lastMonthlyReset?: Date;
};

export const checkCredits = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return c.json(
        {
          success: false,
          message: "User not found",
        },
        404
      );
    }

    const today = new Date();

    let updateNeeded = false;
    let updatedData: updatedDataType = {};

    if (!user.isPremium) {
      if (!user.lastDailyReset || !isSameDayUTC(user.lastDailyReset, today)) {
        updatedData.lastDailyReset = today;
        updatedData.credits = 5;
        updateNeeded = true;
      }
    }

    if (user.isPremium) {
      if (!user.lastResetMonth || !isSameMonthUTC(user.lastResetMonth, today)) {
        updatedData.lastMonthlyReset = today;
        updatedData.credits = 250;
        updateNeeded = true;
      }
    }

    if (updateNeeded) {
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: updatedData,
      });
      logger.info(
        {
          ip,
          requestId,
          userId: userId,
          data: updatedData,
        },
        "Credits update"
      );
    }

    return c.json({
      success: true,
      credits: updateNeeded ? updatedData.credits : user.credits,
      resetApplied: updateNeeded,
    });
  } catch (error) {
    logger.error({ error }, "Error in checkCredits controller");
    return c.json(
      {
        success: false,
        message: "Internal server error",
        error: config.NODE_ENV === "development" ? error : undefined,
      },
      500
    );
  }
};
