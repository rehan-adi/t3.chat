import type { Context } from "hono";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";

/**
 * @desc Create a new profile for the authenticated user.
 * Enforces profile creation limits based on subscription tier
 * and validates that the profile name is provided.
 */

export const createProfile = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPremium: true,
        profiles: {
          select: { id: true },
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

    const profileLimit = user.isPremium ? 10 : 3;

    if (user.profiles.length >= profileLimit) {
      return c.json(
        {
          success: false,
          message: `Profile creation limit reached (${profileLimit})`,
        },
        400,
      );
    }

    const body = await c.req.json<{ profileName: string }>();

    if (!body.profileName || body.profileName.trim() === "") {
      return c.json(
        {
          success: false,
          message: "Profile name is required",
        },
        400,
      );
    }

    const newProfile = await prisma.profile.create({
      data: {
        userId,
        profileName: body.profileName.trim(),
        isDefault: false,
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        profileId: newProfile.id,
      },
      "Profile created successfully",
    );

    return c.json(
      {
        success: true,
        message: "Profile created successfully",
        data: newProfile,
      },
      201,
    );
  } catch (error) {
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "createProfile controller failed",
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
 * @desc Update the name of a profile owned by the authenticated user.
 * Ensures the profile belongs to the user and that a valid name is provided
 * before applying the update.
 */

export const updateProfileName = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;
    const profileId = c.req.param("profileId");

    const body = await c.req.json<{ profileName: string }>();

    if (!body.profileName || body.profileName.trim() === "") {
      return c.json(
        {
          success: false,
          message: "Profile name is required",
        },
        400,
      );
    }

    const profile = await prisma.profile.findFirst({
      where: {
        id: profileId,
        userId,
      },
    });

    if (!profile) {
      return c.json(
        {
          success: false,
          message: "Profile not found",
        },
        404,
      );
    }

    const updated = await prisma.profile.update({
      where: {
        id: profileId,
      },
      data: {
        profileName: body.profileName.trim(),
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        profileId: profileId,
      },
      "Profile name updated successfully",
    );

    return c.json(
      {
        success: true,
        message: "Profile updated successfully",
        data: updated,
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
      "updateProfileName controller failed",
    );
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500,
    );
  }
};

/**
 * @desc Delete a profile owned by the authenticated user.
 * Prevents deletion of the default profile and automatically
 * reassigns the active profile if the deleted profile was active.
 */

export const deleteProfile = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;
    const profileId = c.req.param("profileId");

    const profile = await prisma.profile.findFirst({
      where: {
        id: profileId,
        userId: userId,
      },
      select: {
        id: true,
        userId: true,
        isDefault: true,
      },
    });

    if (!profile) {
      return c.json(
        {
          success: false,
          message: "Profile not found or does not belong to you",
        },
        403,
      );
    }

    if (profile.isDefault) {
      return c.json(
        {
          success: false,
          message: "Default profile cannot be deleted",
        },
        403,
      );
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id: userId,
        },
        select: { activeProfileId: true },
      });

      const isDeletingActive = user?.activeProfileId === profileId;

      await tx.profile.delete({
        where: { id: profileId },
      });

      if (isDeletingActive) {
        const defaultProfile = await tx.profile.findFirst({
          where: {
            userId,
            isDefault: true,
          },
          select: { id: true },
        });

        if (defaultProfile) {
          await tx.user.update({
            where: { id: userId },
            data: {
              activeProfileId: defaultProfile.id,
            },
          });
        }
      }
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        profileId: profileId,
      },
      "Profile deleted successfully",
    );

    return c.json(
      {
        success: true,
        message: "Profile deleted successfully",
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
      "deleteProfile controller failed",
    );
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500,
    );
  }
};

/**
 * @desc Change the active profile for the authenticated user.
 * Validates ownership of the profile and updates the user's
 * activeProfileId to reflect the selected profile.
 */

export const changeActiveProfile = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;
    const profileId = c.req.param("profileId");

    const profile = await prisma.profile.findFirst({
      where: {
        id: profileId,
        userId,
      },
    });

    if (!profile) {
      return c.json(
        {
          success: false,
          message: "Profile not found",
        },
        404,
      );
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        activeProfileId: profile.id,
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        profileId: profileId,
      },
      "Active profile changed successfully",
    );

    return c.json(
      {
        success: true,
        message: "Active profile updated successfully",
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
      "changeActiveProfile controller failed",
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
