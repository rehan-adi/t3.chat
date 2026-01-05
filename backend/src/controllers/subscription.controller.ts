import type { Context } from "hono";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { cashfree } from "@/lib/cashfree";
import { generateOrderId } from "@/utils/generateRandomId";

/**
 * @desc initiateSubscription initiate a order in cashfree and return a payment_session_id.
 * We update our db with status and few data (amount, currency, orderId, paymentId etc).
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
        return_url: `https://www.cashfree.com/devstudio/preview/pg/web/checkout?order_id=${orderId}`,
        notify_url: "http://localhost:4000/api/v1/subscription/webhook",
      },
    };

    let response;

    try {
      response = await cashfree.PGCreateOrder(request);

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentId: response.data.payment_session_id, // this should be actual payment id from cashfree, will change it, we need another field called payment_session_id here
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
 * @desc 
 * @param c Hono Context
 * @returns Json Response
 */

export const cashfreeWebHook = async (c: Context) => {
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

    logger.info({ signature, timestamp, rawBody }, "Data from cashfree");

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

    logger.info(payload);

    // TODO:
    // 1. find payment by payload.order_id
    // 2. idempotency check
    // 3. update payment + user

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
