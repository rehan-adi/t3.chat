import { s3 } from "@/lib/s3";
import type { Context } from "hono";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { redisClient } from "@/lib/redis";
import { deleteCookie } from "hono/cookie";
import { Trait } from "@/generated/prisma/client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  updateNameSchema,
  createApiKeySchema,
} from "@/validations/settings.validations";

/**
 * @desc Retrieve account details for the authenticated user.
 * Returns the user's basic information such as id, name, email,
 * credits, subscription status, profile picture, and account settings
 * like email verification and billing preferences.
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
        isBillingPreferencesEnabled: true,
      },
    });

    if (!user) {
      return c.json(
        {
          success: false,
          message: "User not found",
        },
        404,
      );
    }

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        userEmail: user.email,
      },
      "Account details fetched successfully",
    );

    return c.json(
      {
        success: true,
        message: "Account details fetched successfully",
        data: user,
      },
      200,
    );
  } catch (error) {
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "getAccount controller failed",
    );
    return c.json(
      {
        success: false,
        message: "Internal server error",
        error: config.NODE_ENV == "development" ? error : undefined,
      },
      500,
    );
  }
};

/**
 * @desc Permanently delete the authenticated user's account.
 * Removes the user and all associated data such as profiles,
 * conversations, messages, and related records through
 * database cascade deletion. Also clears cached data and
 * removes the authentication cookie.
 */

export const deleteAccount = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const profiles = await prisma.profile.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
      },
    });

    const profileIds = profiles.map((p) => p.id);

    await prisma.user.delete({
      where: { id: userId },
    });

    try {
      if (profileIds.length > 0) {
        const keys = profileIds.map((id) => `profile:customization:${id}`);
        await redisClient.del(...keys);
      }
    } catch (cacheError) {
      logger.warn(
        {
          ip,
          requestId,
          userId: userId,
          error: cacheError,
        },
        "Failed to clear profile customization cache",
      );
    }

    deleteCookie(c, "token");

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "Account deleted successfully",
    );

    return c.json(
      {
        success: true,
        message: "Account deleted successfully",
      },
      200,
    );
  } catch (error: any) {
    if (error?.code === "P2025") {
      return c.json(
        {
          success: false,
          message: "User not found",
        },
        404,
      );
    }
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "deleteAccount controller failed",
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

/**
 * @desc Update the authenticated user's billing preference.
 * Enables or disables billing features such as payments
 * and premium-related settings for the user's account.
 */

export const updateBillingPreference = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const { isBillingPreferencesEnabled } = await c.req.json();

    if (typeof isBillingPreferencesEnabled !== "boolean") {
      return c.json(
        {
          success: false,
          message: "isBillingPreferencesEnabled must be boolean",
        },
        400,
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isBillingPreferencesEnabled: isBillingPreferencesEnabled,
      },
      select: {
        id: true,
        email: true,
        isBillingPreferencesEnabled: true,
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: user.id,
        isBillingPreferencesEnabled,
      },
      "Billing preference updated",
    );

    return c.json(
      {
        success: true,
        message: "Billing preference updated successfully",
        data: {
          isBillingPreferencesEnabled: user.isBillingPreferencesEnabled,
        },
      },
      200,
    );
  } catch (error) {
    logger.error({ error }, "Error in updateBillingPreference controller");

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

/**
 * @desc Update the authenticated user's display name.
 * Validates the provided name and updates it in the user's account.
 */

export const updateName = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const body = await c.req.json<{ name: string }>();

    const { success, data } = updateNameSchema.safeParse(body);

    if (!success) {
      logger.warn(
        {
          ip,
          requestId,
          userId: userId,
        },
        "Name validation failed",
      );
      return c.json(
        {
          success: false,
          message: "Name is invalid, Length should be min 2 to max 10",
        },
        400,
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { name: data.name },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "Name updated successfully",
    );

    return c.json(
      {
        success: true,
        message: "Name updated successfully",
      },
      200,
    );
  } catch (error: any) {
    if (error?.code === "P2025") {
      return c.json(
        {
          success: false,
          message: "User not found",
        },
        404,
      );
    }
    logger.error({ error }, "Error in updateName controller");
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

/**
 * @desc Update the authenticated user's profile picture.
 * If the user already has a profile picture, the old object
 * is removed from S3 before updating the database.
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
        400,
      );
    }

    const baseUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    const url = `${baseUrl}${key}`;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profilePicture: true,
        email: true,
      },
    });

    if (!user) {
      return c.json(
        {
          success: false,
          message: "User not found",
        },
        404,
      );
    }

    if (user.profilePicture) {
      const oldKey = user.profilePicture.replace(baseUrl, "");

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
          "Old profile picture deleted from S3",
        );
      } catch (error) {
        logger.error(
          {
            ip,
            requestId,
            userId: userId,
            error,
          },
          "Failed to delete old profile picture from S3",
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
      "Profile picture updated successfully",
    );

    return c.json({
      success: true,
      message: "Profile picture updated successfully",
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return c.json(
        {
          success: false,
          message: "User not found",
        },
        404,
      );
    }
    logger.error(
      {
        ip,
        requestId,
        error,
      },
      "Error in updateProfilePicture controller",
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

/**
 * @desc Fetch the system customization for the user's active profile.
 * Customization is stored per profile. This endpoint reads directly from
 * the database because the settings page is low-frequency traffic and
 * requires resolving the user's active or default profile first.
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
        activeProfile: {
          select: {
            id: true,
            systemCustomization: true,
          },
        },
        profiles: {
          select: {
            id: true,
            isDefault: true,
            systemCustomization: true,
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
        404,
      );
    }

    let profileToReturn = user.activeProfile;

    if (!profileToReturn) {
      profileToReturn = user.profiles.find((p) => p.isDefault) || null;
    }

    if (!profileToReturn) {
      return c.json(
        {
          success: false,
          message: "No profile found for user",
        },
        404,
      );
    }

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "System customization fetched successfully",
    );

    return c.json({
      success: true,
      message: "System customization fetched successfully",
      data: {
        profileId: profileToReturn.id,
        systemCustomization: profileToReturn.systemCustomization || null,
      },
    });
  } catch (error) {
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "getCustomization controller failed",
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

/**
 * @desc Create or update system customization for the user's active profile.
 * Customization is stored per profile in the database and the latest version
 * is written to Redis so other high-frequency services can access it quickly.
 */

export const updateCustomization = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        activeProfile: { include: { systemCustomization: true } },
        profiles: true,
      },
    });

    if (!user) {
      return c.json(
        {
          success: false,
          message: "User not found",
        },
        404,
      );
    }

    const profileToUpdate =
      user.activeProfile || user.profiles.find((p) => p.isDefault);

    if (!profileToUpdate) {
      return c.json(
        {
          success: false,
          message: "No profile found for user",
        },
        404,
      );
    }

    const body = await c.req.json<{
      systemName?: string;
      systemBio?: string;
      systemPrompt?: string;
      systemTrait?: Trait[];
    }>();

    const data: Partial<{
      systemName: string;
      systemBio: string;
      systemPrompt: string;
      systemTrait: Trait[];
    }> = {};

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
        400,
      );
    }

    const updated = await prisma.systemCustomization.upsert({
      where: { profileId: profileToUpdate.id },
      create: {
        profileId: profileToUpdate.id,
        systemTrait: data.systemTrait ?? [],
        systemBio: data.systemBio ?? null,
        systemName: data.systemName ?? null,
        systemPrompt: data.systemPrompt ?? "",
      },
      update: { ...data, updatedAt: new Date() },
    });

    await redisClient.set(
      `profile:customization:${profileToUpdate.id}`,
      JSON.stringify(updated),
      "EX",
      24 * 3600,
    );

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "Customization updated successfully",
    );

    return c.json({
      success: true,
      message: "Customization saved successfully",
      data: {
        profileId: profileToUpdate.id,
        systemCustomization: updated,
      },
    });
  } catch (error) {
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "updateCustomization controller failed",
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

/**
 * @desc Fetch the user's OpenRouter API key status and return a masked version of the key.
 * The actual key is never exposed to the client for security reasons.
 */

export const getApiKey = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        isByokEnabled: true,
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
        404,
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
      },
      "API key fetched successfully",
    );

    return c.json({
      success: true,
      message: "API key fetched successfully",
      data: {
        isByokEnabled: user.isByokEnabled,
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
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "getApiKey controller failed",
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

/**
 * @desc Validate and store the user's OpenRouter API key, then enable the BYOK feature.
 * Only one key is allowed per user. The key is verified with OpenRouter before being saved.
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
        "Invalid format for openrouter api key",
      );
      return c.json(
        {
          success: false,
          message: "Invalid format for openrouter api key",
        },
        400,
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
        400,
      );
    }

    const url = `https://openrouter.ai/api/v1/credits`;

    const options = {
      method: "GET",
      headers: { Authorization: `Bearer ${data.key}` },
    };

    try {
      const response = await fetch(url, options);

      if (response.status === 200) {
        await prisma.$transaction(async (tx) => {
          await tx.openRouterApiKey.create({
            data: {
              userId,
              key: data.key,
            },
          });

          await tx.user.update({
            where: {
              id: userId,
            },
            data: {
              isByokEnabled: true,
            },
          });
        });

        logger.info(
          {
            ip,
            requestId,
            userId: userId,
          },
          "API key created successfully",
        );

        return c.json(
          {
            success: true,
            message: "API key created successfully",
          },
          201,
        );
      } else if (response.status === 401) {
        return c.json(
          {
            success: false,
            message: "[UNAUTHORIZED] api key is unauthorized",
          },
          401,
        );
      } else if (response.status === 403) {
        return c.json(
          {
            success: false,
            message: "[FORBIDDEN] request forbidden from openrouter",
          },
          403,
        );
      } else {
        return c.json(
          {
            success: false,
            message: "[INTERNAL] Internal server error",
          },
          500,
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
        "Error from openrouter on api key checking",
      );
      return c.json(
        {
          success: false,
          message: "Error while verifying openrouter API key",
        },
        500,
      );
    }
  } catch (error) {
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "createApiKey controller failed",
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

/**
 * @desc Delete the user's OpenRouter API key and disable the BYOK feature.
 * Ensures both operations occur atomically so the system never ends up
 * with BYOK enabled but no stored API key.
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
        404,
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.openRouterApiKey.delete({
        where: {
          userId: userId,
        },
      });

      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          isByokEnabled: false,
        },
      });
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "API key deleted successfully, and byokEnable is disabled",
    );

    return c.json(
      {
        success: true,
        message: "API key deleted successfully",
      },
      200,
    );
  } catch (error) {
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "deleteApiKey controller failed",
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

/**
 * @desc Fetch paginated chat history for the authenticated user for settings page.
 * Returns the most recently updated conversations first.
 * Each request returns 10 conversations along with pagination metadata.
 */

export const getChatHistory = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const limit = 10;
    const page = Number(c.req.query("page")) || 1;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          profile: {
            userId,
          },
        },
        select: {
          id: true,
          title: true,
          isPinned: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              profileName: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.conversation.count({
        where: {
          profile: {
            userId,
          },
        },
      }),
    ]);

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        page,
      },
      "Chat history fetched successfully",
    );

    return c.json({
      success: true,
      message: "Chat history fetched successfully",
      data: conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "getChatHistory controller failed",
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

/**
 * @desc Delete chat history for the authenticated user from settings page.
 * Allows deleting either all conversations or specific ones by ID.
 * All deletions are restricted to conversations that belong to the user
 * across all of their profiles.
 */

export const deleteChatHistory = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const body = await c.req.json<{
      ids?: string[];
      deleteAll?: boolean;
    }>();

    if (body.deleteAll) {
      await prisma.conversation.deleteMany({
        where: {
          profile: {
            userId,
          },
        },
      });

      logger.info(
        {
          ip,
          requestId,
          userId: userId,
        },
        "All conversations deleted successfully from chat history",
      );

      return c.json({
        success: true,
        message: "All conversations deleted successfully from chat history",
      });
    }

    if (body.ids && body.ids.length > 0) {
      await prisma.conversation.deleteMany({
        where: {
          id: { in: body.ids },
          profile: {
            userId,
          },
        },
      });

      logger.info(
        {
          ip,
          requestId,
          userId: userId,
        },
        "Selected conversations deleted successfully",
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
      400,
    );
  } catch (error) {
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "deleteChatHistory controller failed",
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
