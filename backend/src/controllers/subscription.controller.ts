import type { Context } from "hono";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { cashfree } from "@/lib/cashfree";
import { generateOrderId } from "@/utils/generateRandomId";

/**
 * @desc initiateSubscription initiate a order in cashfree and return a payment_session_id.
 * We update our db with status PENDING and add few data
 * (amount, currency, orderId, paymentSessionId etc).
 * @param c Hono Context
 * @returns Json response with data
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
        400
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
        404
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
        200
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
        "Cashfree order creation failed"
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
        502
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
      "Subscription order created successfully"
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
      201
    );
  } catch (error) {
    logger.error({ error }, "Error in initiateSubscription controller");
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
 * @desc verifySubscriptionStatus verifies subscription status from db.
 * If payment is SUCCESS or FAILED we return response.
 * If status is still pending we check cashfree and update db if status is PAID
 * @param c Hono Context
 * @returns Json Response
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
        400
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
        404
      );
    }

    if (order?.status === "SUCCESS") {
      return c.json(
        {
          success: true,
          message: "Subscription success",
        },
        200
      );
    }

    if (order?.status === "FAILED") {
      return c.json(
        {
          success: true,
          message: "Subscription failed",
        },
        200
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
          200
        );
      }
    } catch (error: any) {
      logger.error(
        {
          ip,
          requestId,
          error: error.response.data.message,
        },
        "Failed to check order status in cashfree"
      );
    }

    return c.json(
      {
        success: true,
        status: order.status,
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in verifySubscriptionStatus controller");
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
 * @desc cashfreeWebHook is update db status based on the payment status in cashfree.
 * Cashfree hits our API when subscription payment succeeds or fails.
 * @param c Hono Context
 * @returns Json Response
 */

export const cashfreeWebHook = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const signature = c.req.header("x-webhook-signature");
    const timestamp = c.req.header("x-webhook-timestamp");

    if (!signature || !timestamp) {
      return c.json(
        {
          success: false,
          message: "Missing webhook headers",
        },
        400
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
        "Invalid Cashfree webhook signature"
      );
      return c.json(
        {
          success: false,
          message: "Invalid signature",
        },
        401
      );
    }

    const payload = JSON.parse(rawBody);

    const order = await prisma.payment.findUnique({
      where: {
        orderId: payload.data.order.order_id,
      },
    });

    if (!order) {
      logger.warn(
        { ip, requestId, orderId: payload.data.order.order_id },
        "Payment not found for webhook"
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
        `Payment already SUCCESSED for this orderId ${order.id}`
      );
      return c.json(
        {
          success: true,
        },
        200
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
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in cashfreeWebHook controller");
    return c.json(
      {
        success: false,
        message: "Internal server error",
      },
      500
    );
  }
};
