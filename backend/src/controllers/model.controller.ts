import type { Context } from "hono";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { MODELS } from "@/contants/models";

export const getAllModels = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const availableModels = MODELS.filter((m) => m.enabled);

    return c.json({
      success: true,
      data: availableModels,
    });
  } catch (error) {
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "getAllModels controller failed",
    );
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
