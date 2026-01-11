import { resend } from "@/lib/resend";
import { logger } from "@/utils/logger";

export const sendOtpEmail = async (to: string, otp: string) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 24px; background: #f7f7f9;">
        <div style="max-width: 480px; margin: auto; background: white; padding: 32px; border-radius: 12px; border: 1px solid #eee;">
          
          <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #111;">
            Your Verification Code
          </h2>

          <p style="margin-top: 16px; font-size: 15px; color: #555;">
            Use the OTP below to continue. This code will expire in 5 minutes.
          </p>

          <div style="margin-top: 24px; text-align: center;">
            <div style="
              display: inline-block;
              padding: 12px 24px;
              background: #111827;
              color: white;
              font-size: 28px;
              letter-spacing: 4px;
              border-radius: 8px;
              font-weight: bold;
            ">
              ${otp}
            </div>
          </div>

          <p style="margin-top: 32px; font-size: 14px; color: #777;">
            If you didn’t request this, you can safely ignore the email.
          </p>

        </div>
      </div>
    `;
    const { error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: to,
      subject: "Your verification code",
      html: html,
    });

    if (error) {
      logger.error(error);
    }

    logger.info("OTP email sent successfully");
  } catch (error) {
    logger.error(
      {
        error,
        context: "RESEND_ERROR_OTP_EMAIL",
      },
      "Error in sending otp email, RESEND_ERROR"
    );
  }
};

export const sendWelcomeEmail = async (to: string) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 24px; background: #f7f7f9;">
        <div style="max-width: 480px; margin: auto; background: white; padding: 32px; border-radius: 12px; border: 1px solid #eee;">
          
          <h2 style="margin: 0; font-size: 26px; font-weight: 700; color: #111;">
            Welcome to t3.chat
          </h2>

          <p style="margin-top: 16px; font-size: 15px; color: #555;">
            Thanks for joining us. You’re all set to start exploring everything we offer.
          </p>

        </div>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to,
      subject: "Welcome to t3.chat",
      html,
    });

    if (error) {
      logger.error(error);
    }

    logger.info({ to }, "Welcome email sent successfully");
  } catch (error) {
    logger.error(
      {
        error,
        context: "RESEND_ERROR_WELCOME_EMAIL",
      },
      "Error in sending welcome email, RESEND_ERROR"
    );
  }
};

type SubscriptionEmailProps = {
  to: string;
  planName: string;
  amount: number;
  billingCycle: "monthly";
};

export const sendSubscriptionSuccessEmail = async ({
  to,
  planName,
  amount,
  billingCycle = "monthly",
}: SubscriptionEmailProps) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 24px; background: #f7f7f9;">
        <div style="max-width: 520px; margin: auto; background: white; padding: 32px; border-radius: 12px; border: 1px solid #eee;">
          
          <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111;">
            Subscription Activated 
          </h2>

          <p style="margin-top: 16px; font-size: 15px; color: #555;">
            Your subscription has been successfully activated. You now have full access to your plan.
          </p>

          <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #374151;">
              <strong>Plan:</strong> ${planName}
            </p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #374151;">
              <strong>Billing:</strong> ${amount} / ${billingCycle}
            </p>
          </div>

          <p style="margin-top: 24px; font-size: 13px; color: #999;">
            Thanks for choosing us,<br />
            <strong>T3 Chat</strong>
          </p>

        </div>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to,
      subject: "Your subscription is now active",
      html,
    });

    if (error) {
      logger.error(error);
      return;
    }

    logger.info({ to, planName }, "Subscription success email sent");
  } catch (error) {
    logger.error(
      {
        error,
        context: "RESEND_ERROR_SUBSCRIPTION_EMAIL",
      },
      "Error sending subscription success email"
    );
  }
};
