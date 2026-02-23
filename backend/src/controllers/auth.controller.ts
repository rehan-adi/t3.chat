import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import type { Context } from "hono";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { redisClient } from "@/lib/redis";
import { deleteCookie, setCookie } from "hono/cookie";
import {
  verifyOtpSchema,
  requestOtpSchema,
} from "@/validations/auth.validations";
import { generateRandomId } from "@/utils/generateRandomId";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { sendOtpEmail, sendWelcomeEmail } from "@/utils/sendEmail";

/**
 * @desc Request a one time password (OTP) for authentication.
 * If the user does not exist, a new user and default profile are created.
 * Generates a 6-digit OTP, stores it temporarily in Redis with expiration,
 * and sends it to the user's email.
 */

export const requestOtp = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const body = await c.req.json<{ email: string }>();

    const { success, data } = requestOtpSchema.safeParse(body);

    if (!success) {
      logger.warn({ ip, requestId }, "Email validation failed");
      return c.json(
        {
          success: false,
          message: "Email validation error",
        },
        400,
      );
    }

    let user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    let statusCode: ContentfulStatusCode = 200;

    if (!user) {
      const randomId = generateRandomId();

      user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: data.email,
            name: `User-${randomId}`,
          },
        });

        const profile = await tx.profile.create({
          data: {
            isDefault: true,
            userId: createdUser.id,
            profileName: createdUser.name!,
          },
        });

        await tx.user.update({
          where: {
            id: createdUser.id,
          },
          data: {
            activeProfileId: profile.id,
          },
        });

        return createdUser;
      });

      statusCode = 201;
    }

    const otp = randomInt(100000, 1000000).toString();

    await redisClient.set(`user:otp:${user.email}`, otp, "EX", 5 * 60);

    if (config.NODE_ENV === "development") {
      logger.info({ otp: otp }, ` otp for user ${user.email}`);
    } else {
      try {
        await sendOtpEmail(user.email, otp);
      } catch (error) {
        logger.error(
          {
            ip,
            requestId,
            userId: user.id,
            error,
          },
          "Failed to send OTP to user's email",
        );
        return c.json(
          {
            success: false,
            message: "Failed to send OTP",
          },
          500,
        );
      }
    }

    logger.info(
      {
        ip,
        requestId,
        userId: user.id,
      },
      "OTP generated and sent successfully",
    );

    return c.json(
      {
        success: true,
        message: "OTP sent successfully to your email",
      },
      statusCode,
    );
  } catch (error) {
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "requestOtp controller failed",
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
 * @desc Verify the provided OTP and authenticate the user.
 * Validates the OTP against Redis, marks the email as verified if first-time login,
 * generates a JWT token, sets it in a secure HTTP-only cookie,
 * and establishes an authenticated session.
 */

export const verifyOtp = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const body = await c.req.json<{ email: string; otp: string }>();

    const { success, data } = verifyOtpSchema.safeParse(body);

    if (!success) {
      logger.warn({ ip, requestId }, "Email or OTP validation failed");
      return c.json(
        {
          success: false,
          message: "Email or OTP validation failed",
        },
        400,
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!existingUser) {
      return c.json(
        {
          success: false,
          message: "User not found, please try using different email",
        },
        404,
      );
    }

    const otp = await redisClient.get(`user:otp:${existingUser.email}`);

    if (otp === null) {
      return c.json(
        {
          success: false,
          message: "OTP is expired, Please try again with a new OTP",
        },
        400,
      );
    }

    if (otp !== data.otp) {
      return c.json(
        {
          success: false,
          message: "OTP is incorrect, Please enter the right OTP",
        },
        400,
      );
    }

    if (!existingUser.isEmailVerified) {
      await prisma.user.update({
        where: {
          email: existingUser.email,
        },
        data: {
          isEmailVerified: true,
        },
      });

      if (config.NODE_ENV === "production") {
        try {
          await sendWelcomeEmail(existingUser.email);
        } catch (error) {
          logger.error(
            {
              ip,
              requestId,
              userId: existingUser.id,
              error,
            },
            "Failed to send welcome email",
          );
        }
      } else {
        logger.info(`Email is verified for ${existingUser.email}`);
      }
    }

    const token = jwt.sign(
      { id: existingUser.id, email: existingUser.email },
      config.JWT_SECRET,
      { expiresIn: "7d" },
    );

    setCookie(c, "token", token, {
      secure: config.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sameSite: "Strict",
      path: "/",
    });

    await redisClient.del(`user:otp:${data.email}`);

    logger.info(
      {
        ip,
        requestId,
        userId: existingUser.id,
      },
      "Signed in successfully",
    );

    return c.json(
      {
        success: true,
        message: "Signed in successfully",
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
      "verifyOtp controller failed",
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
 * @desc Log out the authenticated user.
 * Clears the authentication cookie and invalidates the current session on the client.
 */

export const logout = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    deleteCookie(c, "token");
    return c.json(
      {
        success: true,
        message: "You have been logged out successfully.",
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
      "logout controller failed",
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
