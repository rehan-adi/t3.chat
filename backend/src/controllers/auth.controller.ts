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
 * @desc requestOtp sends an OTP to users email.
 * If the user is new in the system, a new record is created in db and OTP is sent.
 * @param c Hono Context
 * @returns Json response
 */

export const requestOtp = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const body = await c.req.json<{ email: string }>();

    const { success, data } = requestOtpSchema.safeParse(body);

    if (!success) {
      logger.warn(
        {
          ip,
          requestId,
        },
        "Email validation failed"
      );
      return c.json(
        {
          success: false,
          message: "Email validation error",
        },
        400
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

      user = await prisma.user.create({
        data: {
          email: data.email,
          name: `User-${randomId}`,
        },
      });
      statusCode = 201;
    }

    const otp = randomInt(100000, 1000000).toString();

    await redisClient.set(`user:otp:${data.email}`, otp, "EX", 5 * 60);

    if (config.NODE_ENV === "development") {
      logger.info({ otp: otp }, ` otp for user ${user.email}`);
    } else {
      try {
        await sendOtpEmail(data.email, otp);
      } catch (error) {
        logger.error(
          {
            ip,
            requestId,
            userId: user.id,
            email: user.email,
            error,
          },
          "Failed to send OTP to user's email"
        );
        return c.json(
          {
            success: false,
            message: "Failed to send OTP",
          },
          500
        );
      }
    }

    logger.info(
      {
        ip,
        requestId,
        userId: user.id,
        userEmail: user.email,
      },
      "OTP generated and sent successfully"
    );

    return c.json(
      {
        success: true,
        message: "OTP sent successfully to your email",
      },
      statusCode
    );
  } catch (error) {
    logger.error({ error }, "Error in requestOtp controller");
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
 * @desc verifyOtp verifies the OTP of the user and check if it is expired or incorrect.
 * For new users, it updates isEmailVerified field in users table and sends a welcome email.
 * It then generates a JWT token and sets it in a cookie.
 * @param c Hono Context
 * @returns Json response
 */

export const verifyOtp = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const body = await c.req.json<{ email: string; otp: string }>();

    const { success, data } = verifyOtpSchema.safeParse(body);

    if (!success) {
      logger.warn(
        {
          ip,
          requestId,
        },
        "Email or OTP validation failed"
      );
      return c.json(
        {
          success: false,
          message: "Email or OTP validation failed",
        },
        400
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
        404
      );
    }

    const otp = await redisClient.get(`user:otp:${data.email}`);

    if (otp === null) {
      return c.json(
        {
          success: false,
          message: "OTP is expired, Please try again with a new OTP",
        },
        400
      );
    }

    if (otp !== data.otp) {
      return c.json(
        {
          success: false,
          message: "OTP is incorrect, Please enter the right OTP",
        },
        400
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
              email: existingUser.email,
              error,
            },
            "Failed to send welcome email"
          );
        }
      } else {
        logger.info(`Email is verified for ${existingUser.email}`);
      }
    }

    const token = jwt.sign(
      { id: existingUser.id, email: existingUser.email },
      config.JWT_SECRET,
      { expiresIn: "7d" }
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
        userEmail: existingUser.email,
      },
      "Signed in successfully"
    );

    return c.json(
      {
        success: true,
        message: "Signed in successfully",
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in verifyOtp controller");
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
 * @desc logout controller is just clear the cookie nothing else no fucking engeneering here
 * @param c Hono Context
 * @returns Json response
 */

export const logout = async (c: Context) => {
  try {
    deleteCookie(c, "token");
    return c.json(
      {
        success: true,
        message: "You have been logged out successfully.",
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in logout controller");
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
