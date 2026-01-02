import { s3 } from "@/lib/s3";
import type { Context } from "hono";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { redisClient } from "@/lib/redis";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  updateNameSchema,
  createApiKeySchema,
} from "@/validations/settings.validations";

/**
 * @desc getAccount fetch user's account and return needed data.
 * @param c Hono Context
 * @returns Json response with data
 */

export const getAccount = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        isPremium: true,
        profilePicture: true,
        isEmailVerified: true,
        isbillingPreferencesEnable: true,
      },
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

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        userEmail: user.email,
      },
      "Account details fetched successfully"
    );

    return c.json(
      {
        success: true,
        message: "Account details fetched successfully",
        data: user,
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in getAccount controller");
    return c.json(
      {
        success: false,
        message: "Internal server error",
        error: config.NODE_ENV == "development" ? error : undefined,
      },
      500
    );
  }
};

/**
 * @desc deleteAccount permanently delete users account and all associated data.
 * @param c Hono Context
 * @returns Json response
 */

export const deleteAccount = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
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

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    await redisClient.del(`user:customization:${userId}`);

    logger.info(
      {
        ip,
        requestId,
        userId: user.id,
      },
      "Account deleted successfully"
    );

    return c.json(
      {
        success: true,
        message: "Account deleted successfully",
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in deleteAccount controller");
    return c.json(
      {
        success: false,
        message: "Internal server error",
        error: config.NODE_ENV == "development" ? error : undefined,
      },
      500
    );
  }
};

/**
 * @desc updateName update user's name.
 * @param c Hono Context
 * @returns Json response
 */

export const updateName = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return c.json({
        success: false,
        message: "User not found",
      });
    }

    const body = await c.req.json<{ name: string }>();

    const { success, data } = updateNameSchema.safeParse(body);

    if (!success) {
      logger.warn(
        {
          ip,
          requestId,
        },
        "Name validation failed"
      );
      return c.json(
        {
          success: false,
          message: "Name is invalid, Length should be min 2 to max 10",
        },
        400
      );
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name: data.name,
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        userEmail: user.email,
      },
      "Name updated successfully"
    );

    return c.json(
      {
        success: true,
        message: "Name updated successfully",
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in updateName controller");
    return c.json(
      {
        success: false,
        message: "Internal server error",
        error: config.NODE_ENV == "development" ? error : undefined,
      },
      500
    );
  }
};

/**
 * @desc updateProfilePicture update users's profile picture.
 * If user does have a old pfp, delete it from s3 and update db.
 * @param c Hono Context
 * @returns Json response
 */

export const updateProfilePicture = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const { key } = await c.req.json<{ key: string }>();

    if (!key) {
      return c.json(
        {
          success: false,
          message: "No key provided",
        },
        400
      );
    }

    const url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

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

    if (user?.profilePicture) {
      const oldKey = user.profilePicture?.replace(
        `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
        ""
      );

      const command = new DeleteObjectCommand({
        Bucket: config.AWS_S3_BUCKET,
        Key: oldKey,
      });

      try {
        await s3.send(command);
        logger.info(
          {
            ip,
            requestId,
            userId: userId,
          },
          "User's old profile picture deleted successfully from S3"
        );
      } catch (error) {
        logger.error(
          {
            ip,
            requestId,
            userId: userId,
            userEmail: user.email,
            error,
          },
          "Error while deleting user's old pfp key from s3"
        );
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: url },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "Profile picture updated successfully"
    );

    return c.json({
      success: true,
      message: "Profile picture updated successfully",
    });
  } catch (error) {
    logger.error({ error }, "Error in updateProfilePicture controller");
    return c.json(
      {
        success: false,
        message: "Internal server error",
        error: config.NODE_ENV == "development" ? error : undefined,
      },
      500
    );
  }
};

/**
 * @desc getCustomization just fetch users customization data and return it
 * @param c Hono Context
 * @returns Json response with data
 */

export const getCustomization = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        email: true,
        systemCustomizations: true,
      },
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

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        userEmail: user.email,
      },
      "System customizations fetched successfully"
    );

    return c.json(
      {
        success: true,
        message: "System customizations fetched successfully",
        data: user,
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in getCustomization controller");
    return c.json(
      {
        success: false,
        message: "Internal server error",
        error: config.NODE_ENV == "development" ? error : undefined,
      },
      500
    );
  }
};

/**
 * @desc updateCustomization update or create users Customization data.
 * It set's the customization data into Redis cache for 1 day.
 * @param c Hono Context
 * @returns Json response
 */

export const updateCustomization = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
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

    const body = await c.req.json<{
      systemName?: string;
      systemBio?: string;
      systemPrompt?: string;
      systemTrait?: string[];
    }>();

    const data: any = {};

    if (body.systemBio !== undefined) data.systemBio = body.systemBio;
    if (body.systemName !== undefined) data.systemName = body.systemName;
    if (body.systemTrait !== undefined) data.systemTrait = body.systemTrait;
    if (body.systemPrompt !== undefined) data.systemPrompt = body.systemPrompt;

    if (Object.keys(data).length === 0) {
      return c.json(
        {
          success: false,
          message: "No valid customization fields provided",
        },
        400
      );
    }

    const updated = await prisma.systemCustomization.upsert({
      where: { userId },
      create: {
        userId,
        systemTrait: data.systemTrait ?? [],
        systemBio: data.systemBio ?? null,
        systemName: data.systemName ?? null,
        systemPrompt: data.systemPrompt ?? "",
      },
      update: {
        ...data,
        updatedAt: new Date(),
      },
    });

    await redisClient.set(
      `user:customization:${userId}`,
      JSON.stringify(updated),
      "EX",
      24 * 3600
    );

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        userEmail: user.email,
      },
      "Customization saved successfully"
    );

    return c.json(
      {
        success: true,
        message: "Customization saved successfully",
        data: updated,
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in updateCustomization controller");
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

/**
 * @desc getApiKey fetch users openouter api key and return it to user.
 * @param c Hono Context
 * @returns Json response with data
 */

export const getApiKey = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        byokEnable: true,
        email: true,
        openRouterApiKey: {
          select: {
            id: true,
            key: true,
            createdAt: true,
          },
        },
      },
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

    let maskedKey: string | null = null;

    if (user.openRouterApiKey?.key) {
      const key = user.openRouterApiKey.key;
      maskedKey =
        key.length > 8 ? `${key.slice(0, 4)}****${key.slice(-4)}` : "****";
    }

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        userEmail: user.email,
      },
      "API key fetched successfully"
    );

    return c.json({
      success: true,
      message: "API key fetched successfully",
      data: {
        byokEnable: user.byokEnable,
        apiKey: user.openRouterApiKey
          ? {
              id: user.openRouterApiKey.id,
              maskedKey,
              createdAt: user.openRouterApiKey.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error({ error }, "Error in getApiKeyDetails controller");
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

/**
 * @desc createApiKey create a entry in openRouterApiKey table for user.
 * User can have one key at a time, if user is creating one we enable byokEnable.
 * @param c Hono Context
 * @returns Json response
 */

export const createApiKey = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const body = await c.req.json<{
      key: string;
    }>();

    const { success, data } = createApiKeySchema.safeParse(body);

    if (!success) {
      logger.warn(
        {
          ip,
          requestId,
        },
        "Invalid format for openrouter api key"
      );
      return c.json(
        {
          success: false,
          message: "Invalid format for openrouter api key",
        },
        400
      );
    }

    const existingKey = await prisma.openRouterApiKey.findUnique({
      where: { userId },
    });

    if (existingKey) {
      return c.json(
        {
          success: false,
          message: "API key already exists",
        },
        400
      );
    }

    const url = `https://openrouter.ai/api/v1/keys/${data.key}`;

    const options = {
      method: "GET",
      headers: { Authorization: `Bearer ${data.key}` },
    };

    try {
      const response = await fetch(url, options);

      if (response.status === 200) {
        await prisma.openRouterApiKey.create({
          data: {
            userId,
            key: data.key,
          },
        });

        await prisma.user.update({
          where: { id: userId },
          data: { byokEnable: true },
        });

        logger.info(
          {
            ip,
            requestId,
            userId: userId,
          },
          "API key created successfully"
        );

        return c.json(
          {
            success: true,
            message: "API key created successfully",
          },
          201
        );
      } else if (response.status === 401) {
        return c.json(
          {
            success: false,
            message: "[UNAUTHORIZED] api key is unauthorized",
          },
          401
        );
      } else {
        return c.json(
          {
            success: false,
            message: "[INTERNAL] Internal server error",
          },
          500
        );
      }
    } catch (error) {
      logger.error(
        {
          ip,
          requestId,
          userId: userId,
          error,
        },
        "Error from openrouter on api key checking"
      );
      return c.json(
        {
          success: false,
          message: "Error while verifing OpenRouter API key",
        },
        500
      );
    }
  } catch (error) {
    logger.error({ error }, "Error in createApiKey controller");
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

/**
 * @desc deleteApiKey delete users api key and disable byokEnable
 * @param c Hono Context
 * @returns Json response
 */

export const deleteApiKey = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const existingKey = await prisma.openRouterApiKey.findUnique({
      where: { userId },
    });

    if (!existingKey) {
      return c.json(
        {
          success: false,
          message: "No API key found",
        },
        404
      );
    }

    await prisma.openRouterApiKey.delete({
      where: { userId },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { byokEnable: false },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "API key deleted successfully, and byokEnable is disabled"
    );

    return c.json(
      {
        success: true,
        message: "API key deleted successfully",
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in deleteApiKey controller");
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

/**
 * @desc getChatHistory fetch all conversation
 * @param c Hono Context
 * @returns Json response with data
 */

export const getChatHistory = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "Chat history fetched successfully"
    );

    return c.json({
      success: true,
      message: "Chat history fetched successfully",
      data: conversations,
    });
  } catch (error) {
    logger.error({ error }, "Error in getChatHistory controller");
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

/**
 * @desc deleteChatHistory delete chat history of user.
 * It accept two things id's of chat history and deleteAll flag.
 * If deleteAll then it delete all chat history. And for ids it delete given onces
 * @param c Hono Context
 * @returns Json response with data
 */

export const deleteChatHistory = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
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

    const body = await c.req.json<{
      deleteAll?: boolean;
      ids?: string[];
    }>();

    if (body.deleteAll) {
      await prisma.conversation.deleteMany({
        where: { userId },
      });

      logger.info(
        {
          ip,
          requestId,
          userId: userId,
        },
        "All conversations deleted successfully"
      );

      return c.json({
        success: true,
        message: "All conversations deleted successfully",
      });
    }

    if (body.ids && body.ids.length > 0) {
      await prisma.conversation.deleteMany({
        where: {
          id: { in: body.ids },
          userId,
        },
      });

      logger.info(
        {
          ip,
          requestId,
          userId: userId,
        },
        "Selected conversations deleted successfully"
      );

      return c.json({
        success: true,
        message: "Selected conversations deleted successfully",
      });
    }

    return c.json(
      {
        success: false,
        message: "No IDs or deleteAll flag provided",
      },
      400
    );
  } catch (error) {
    logger.error({ error }, "Error in deleteChatHistory controller");
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
