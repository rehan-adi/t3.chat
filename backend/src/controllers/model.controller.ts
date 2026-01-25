import type { Context } from "hono";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { MODELS } from "@/contants/models";

export const getAllModels = async (c: Context) => {
  try {
    const availableModels = MODELS.filter((m) => m.enabled);

    return c.json({
      success: true,
      data: availableModels,
    });
  } catch (error) {
    logger.error({ error }, "Error in getAllModels controller");
    return c.json(
      {
        success: false,
        message: "Internal server error",
        error: config.NODE_ENV === "development" ? error : undefined,
      },
      500,
    );
  }
};
