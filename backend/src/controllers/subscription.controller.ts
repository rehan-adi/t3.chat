import type { Context } from "hono";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { cashfree } from "@/lib/cashfree";
import { generateOrderId } from "@/utils/generateRandomId";
import { sendSubscriptionSuccessEmail } from "@/utils/sendEmail";

/**
 * @desc Initiates a subscription order using Cashfree payment gateway.
 * Validates the selected plan, checks for any existing pending payments,
 * creates a new payment record with status "PENDING", and generates a unique order ID.
 * Calls Cashfree to create an order and retrieves a payment session ID.
 * Updates the payment record with the session ID and returns all relevant order details
 * for client-side processing.
 *
 * Handles errors by updating the payment status to "INIT_ORDER_FAILED" if Cashfree order creation fails.
 */

const subscriptionPlan = {
  PREMIUM: 450,
};

type PlanId = keyof typeof subscriptionPlan;

export const initiateSubscription = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const body = await c.req.json<{
      planId: string;
    }>();

    if (!body.planId || !(body.planId in subscriptionPlan)) {
      return c.json(
        {
          success: false,
          message: "Invalid subscription plan",
        },
        400,
      );
    }

    const amount = subscriptionPlan[body.planId as PlanId];

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
        404,
      );
    }

    const existingPending = await prisma.payment.findFirst({
      where: {
        userId,
        status: "PENDING",
      },
    });

    if (existingPending) {
      return c.json(
        {
          success: true,
          message: "Payment already initiated",
          data: {
            order_id: existingPending.orderId,
            payment_session_id: existingPending.paymentSessionId,
          },
        },
        200,
      );
    }

    const orderId = generateOrderId();

    const payment = await prisma.payment.create({
      data: {
        userId: userId,
        amount: amount,
        currency: "INR",
        orderId: orderId,
        status: "PENDING",
      },
    });

    const request = {
      order_id: orderId,
      order_currency: "INR",
      order_amount: amount,
      customer_details: {
        customer_id: user.id,
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `${config.FRONTEND_ORIGIN}/subscription/verify?order_id=${orderId}`,
        notify_url: `${config.BACKEND_ORIGIN}/api/v1/subscription/webhook`,
      },
    };

    let response;

    try {
      response = await cashfree.PGCreateOrder(request);

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentSessionId: response.data.payment_session_id,
        },
      });
    } catch (error: any) {
      logger.error(
        {
          ip,
          requestId,
          orderId: orderId,
          error: error?.response?.data,
        },
        "Cashfree order creation failed",
      );

      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "INIT_ORDER_FAILED",
        },
      });

      return c.json(
        {
          success: false,
          message: "Failed to create subscription order",
        },
        502,
      );
    }

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        orderId: orderId,
        payment_session_id: response.data.payment_session_id,
      },
      "Subscription order created successfully",
    );

    return c.json(
      {
        success: true,
        message: "Subscription order created successfully",
        data: {
          entity: response.data.entity,
          order_id: response.data.order_id,
          order_amount: response.data.order_amount,
          order_status: response.data.order_status,
          order_currency: response.data.order_currency,
          order_expiry_time: response.data.order_expiry_time,
          payment_session_id: response.data.payment_session_id,
        },
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
      "initiateSubscription controller failed",
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
 * @desc Verifies the subscription payment status for a given order.
 * Checks the database for the current status:
 *   - If status is "SUCCESS" or "FAILED", returns it immediately.
 *   - If status is "PENDING", queries Cashfree to fetch the latest status.
 *     - Updates the database to "SUCCESS" if payment is confirmed.
 * Returns the current status and a relevant message.
 *
 * Handles errors gracefully and logs any failures in fetching the status from Cashfree.
 */

export const verifySubscriptionStatus = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const orderId = c.req.param("orderId");

    if (!orderId) {
      return c.json(
        {
          success: false,
          message: "OrderId not provided",
        },
        400,
      );
    }

    let order = await prisma.payment.findUnique({
      where: {
        orderId: orderId,
      },
    });

    if (!order) {
      return c.json(
        {
          success: false,
          message: `Order not found for orderId ${orderId}`,
        },
        404,
      );
    }

    if (order?.status === "SUCCESS") {
      return c.json(
        {
          success: true,
          message: "Subscription success",
        },
        200,
      );
    }

    if (order?.status === "FAILED") {
      return c.json(
        {
          success: true,
          message: "Subscription failed",
        },
        200,
      );
    }

    try {
      const response = await cashfree.PGFetchOrder(orderId);

      if (response.data.order_status === "PAID") {
        order = await prisma.payment.update({
          where: {
            id: order.id,
          },
          data: {
            status: "SUCCESS",
          },
        });

        return c.json(
          {
            success: true,
            status: order.status,
          },
          200,
        );
      }
    } catch (error: any) {
      logger.error(
        {
          ip,
          requestId,
          error: error.response.data.message,
        },
        "Failed to check order status in cashfree",
      );
    }

    return c.json(
      {
        success: true,
        status: order.status,
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
      "verifySubscriptionStatus controller failed",
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
 * @desc Handles Cashfree subscription payment webhooks and updates database accordingly.
 *
 * This endpoint is called by Cashfree when a subscription payment succeeds, fails, or is dropped by the user.
 * Steps performed:
 *   - Verifies webhook signature to ensure authenticity.
 *   - Finds the payment in the database using orderId.
 *   - If the payment is already SUCCESS, logs and returns immediately.
 *   - Updates payment status to SUCCESS if payment succeeded, and marks the user as premium.
 *   - Sends subscription success email after successful payment.
 *   - Updates payment status to FAILED if payment failed or user dropped.
 *   - Stores the raw webhook payload for reference.
 */

export const cashfreeWebHook = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const signature = c.req.header("x-webhook-signature");
    const timestamp = c.req.header("x-webhook-timestamp");

    if (!signature || !timestamp) {
      logger.warn(
        {
          ip,
          requestId,
        },
        "Missing webhook headers",
      );
      return c.json(
        {
          success: true,
        },
        200,
      );
    }

    const rawBody = await c.req.text();

    try {
      cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
    } catch (err: any) {
      logger.warn(
        {
          error: err.message,
        },
        "Invalid Cashfree webhook signature",
      );
      return c.json(
        {
          success: true,
        },
        200,
      );
    }

    const payload = JSON.parse(rawBody);

    const order = await prisma.payment.findUnique({
      where: {
        orderId: payload.data.order.order_id,
      },
      include: { user: true },
    });

    if (!order) {
      logger.warn(
        { ip, requestId, orderId: payload.data.order.order_id },
        "Payment not found for webhook",
      );

      return c.json({ success: true }, 200);
    }

    if (order?.status === "SUCCESS") {
      logger.info(
        {
          ip,
          requestId,
          orderId: payload.data.order.order_id,
        },
        `Payment already SUCCESS for this orderId ${order.id}`,
      );
      return c.json(
        {
          success: true,
        },
        200,
      );
    }

    if (payload.type === "PAYMENT_SUCCESS_WEBHOOK") {
      if (
        order?.status === "PENDING" &&
        payload.data.payment.payment_status === "SUCCESS"
      ) {
        await prisma.$transaction([
          prisma.payment.update({
            where: {
              id: order.id,
            },
            data: {
              status: "SUCCESS",
              paymentId: payload.data.payment.cf_payment_id,
              paymentEventTime: payload.data.payment.payment_time,
              rawWebhookPayload: payload,
              updatedAt: new Date(),
            },
          }),
          prisma.user.update({
            where: {
              id: order.userId,
            },
            data: {
              isPremium: true,
            },
          }),
        ]);
        try {
          await sendSubscriptionSuccessEmail({
            to: order.user.email,
            planName: "PREMIUM",
            amount: subscriptionPlan.PREMIUM,
            billingCycle: "monthly",
          });
        } catch (err) {
          logger.error(
            { err, orderId: order.id },
            "Failed to send Email after payment success",
          );
        }
      }
    } else if (payload.type === "PAYMENT_FAILED_WEBHOOK") {
      if (payload.data.payment.payment_status === "FAILED") {
        await prisma.payment.update({
          where: {
            id: order?.id,
          },
          data: {
            status: "FAILED",
            rawWebhookPayload: payload,
            paymentId: payload.data.payment.cf_payment_id,
            paymentEventTime: payload.data.payment.payment_time,
            updatedAt: new Date(),
          },
        });
      }
    } else if (payload.type === "PAYMENT_USER_DROPPED_WEBHOOK") {
      await prisma.payment.update({
        where: {
          id: order.id,
        },
        data: {
          status: "FAILED",
          rawWebhookPayload: payload,
          updatedAt: new Date(),
        },
      });
    }

    return c.json(
      {
        success: true,
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
      "cashfreeWebHook controller failed",
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
