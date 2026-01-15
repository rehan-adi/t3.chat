import type { Context } from "hono";
import { prisma } from "@/lib/prisma";
import { Models } from "@/types/types";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { redisClient } from "@/lib/redis";
import { streamSSE } from "hono/streaming";
import type { Message } from "@openrouter/sdk/models";
import { createOpenRouterClient } from "@/lib/openrouter";
import { userProfilePrompt } from "@/utils/userProfilePrompt";
import { updateConversationSchema } from "@/validations/conversation.validation";

/**
 * @desc getAllConversation fetch all conversations for the authenticated user along with basic profile info
 * @param c Hono Context
 * @returns Json Respons with data
 */

export const getAllConversation = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const userWithConversation = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        isPremium: true,
        profilePicture: true,
        conversation: {
          select: {
            id: true,
            title: true,
            pinned: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
        },
      },
    });

    if (!userWithConversation) {
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
        ip: ip,
        requestId: requestId,
        userId: userId,
      },
      "Data fetched successfully"
    );

    return c.json(
      {
        success: true,
        message: "Data fetched successfully",
        data: userWithConversation,
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in getAllConversation controller");
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
 * @desc getConversationById fetch a single conversation and its messages by conversationId
 * @param c Hono Context
 * @returns Json Respons with data
 */ // (WORK NEED)

export const getConversationById = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;
    const conversationId = c.req.param("conversationId");

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

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return c.json(
        {
          success: false,
          message: "Conversation not found or does not belong to you",
        },
        403
      );
    }

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        userEmail: user.email,
        conversationId: conversationId,
      },
      "Fetched conversation successfully"
    );

    return c.json(
      {
        success: true,
        message: "Conversation fetched successfully",
        data: conversation,
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in getConversationById controller");
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
 * @desc updateConversationPin pin and unpin the Conversation
 * @param c Hono Context
 * @returns Json Respons with data
 */

export const updateConversationPin = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

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

    const conversationId = c.req.param("conversationId");

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return c.json(
        {
          success: false,
          message: "Conversation not found or does not belong to you",
        },
        403
      );
    }

    const body = await c.req.json<{ pinned: boolean }>();

    if (typeof body.pinned !== "boolean") {
      return c.json(
        {
          success: false,
          message: "Pinned value must be boolean",
        },
        400
      );
    }

    const update = await prisma.conversation.update({
      where: { id: conversationId },
      data: { pinned: body.pinned },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        userEmail: user.email,
        conversationId: conversationId,
      },
      `Conversation ${body.pinned ? "pinned" : "unpinned"} successfully`
    );

    return c.json(
      {
        success: true,
        message: `Conversation ${
          body.pinned ? "pinned" : "unpinned"
        } successfully`,
        data: update,
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in updateConversationPin controller");
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
 * @desc updateConversation updates Title of a conversation by conversationId.
 * @param c Hono Context
 * @returns Json Respons with data
 */

export const updateConversation = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

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

    const conversationId = c.req.param("conversationId");

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return c.json(
        {
          success: false,
          message: "Conversation not found or does not belong to you",
        },
        403
      );
    }

    const body = await c.req.json<{ title: string }>();

    const { success, data, error } = updateConversationSchema.safeParse(body);

    if (!success) {
      return c.json(
        {
          success: false,
          message: error.message,
        },
        400
      );
    }

    const updatedConversation = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        title: data?.title,
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        userEmail: user.email,
        conversationId: conversationId,
      },
      "Conversation title updated successfully"
    );

    return c.json(
      {
        success: true,
        message: "Conversation title updated successfully",
        data: updatedConversation,
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in updateConversation controller");
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
 * @desc deleteConversation delete users one conversation using conversationId.
 * @param c Hono Context
 * @returns Json Respons
 */

export const deleteConversation = async (c: Context) => {
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

    const conversationId = c.req.param("conversationId");

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      return c.json(
        {
          success: false,
          message: "Conversation not found or does not belong to you",
        },
        403
      );
    }

    await prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        userEmail: user.email,
      },
      "Conversation deleted successfully"
    );

    return c.json(
      {
        success: true,
        message: "Conversation deleted successfully",
      },
      200
    );
  } catch (error) {
    logger.error({ error }, "Error in deleteConversation controller");
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
 * @desc conversationChatController do nothing, just call LLM api that's it 😇.
 * @param c Hono Context
 * @returns Stream Respons
 */

export const conversationChatController = async (c: Context) => {
  let id = 0;

  try {
    const body = await c.req.json<{
      conversationId?: string;
      prompt: string;
      model: string;
    }>();

    const { conversationId, prompt, model: modelId } = body;

    const model = Models.find((m) => m.id === modelId);

    if (!model) {
      return c.json(
        {
          success: false,
          message: "Model is not supported",
        },
        400
      );
    }

    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { openRouterApiKey: true },
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

    let apiKeyToUse = config.OPENROUTER_API_KEY;
    let billingMode: "BYOK" | "PREMIUM" | "CREDITS" = "CREDITS";

    if (user.byokEnable && user.openRouterApiKey?.key) {
      apiKeyToUse = user.openRouterApiKey.key;
      billingMode = "BYOK";
    } else if (user.isPremium) {
      apiKeyToUse = config.OPENROUTER_API_KEY;
      billingMode = "PREMIUM";
    } else {
      if (user.credits <= 0) {
        return c.json(
          {
            success: false,
            message: "You are out of credits, upgrade to premium",
          },
          402
        );
      }
    }

    let finalConversationId = conversationId;

    if (!finalConversationId) {
      const newConv = await prisma.conversation.create({
        data: {
          userId,
          title: prompt.slice(0, 20) + "...",
        },
      });
      finalConversationId = newConv.id;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: finalConversationId },
    });

    if (!conversation || conversation.userId !== userId) {
      return c.json(
        {
          success: false,
          message: "Conversation does not exist or does not belong to you",
        },
        403
      );
    }

    const recentMessages = await prisma.message.findMany({
      where: { conversationId: finalConversationId },
      orderBy: { createdAt: "asc" },
      take: 5,
    });

    await prisma.message.create({
      data: {
        conversationId: finalConversationId,
        role: "user",
        response: prompt,
        modelName: model.name,
      },
    });

    let profile = null;

    const cached = await redisClient.get(`user:customization:${userId}`);

    if (cached) {
      profile = JSON.parse(cached);
    } else {
      profile = await prisma.systemCustomization.findFirst({
        where: { userId },
        select: {
          systemName: true,
          systemBio: true,
          systemPrompt: true,
          systemTrait: true,
        },
      });

      if (profile) {
        await redisClient.set(
          `user:customization:${userId}`,
          JSON.stringify(profile),
          "EX",
          3600
        );
      }
    }

    const systemPrompt = profile
      ? userProfilePrompt(profile)
      : "The user has not provided personal details. But call users as bro and be formal";

    const finalMessages: Message[] = [];

    finalMessages.push({ role: "system", content: systemPrompt });

    if (conversation.summary) {
      finalMessages.push({
        role: "system",
        content: `Conversation summary so far: ${conversation.summary}`,
      });
    }

    for (const msg of recentMessages) {
      finalMessages.push({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.response,
      });
    }

    finalMessages.push({ role: "user", content: prompt });

    const openRouterClient = createOpenRouterClient(apiKeyToUse);

    const aiStream = await openRouterClient.chat.send({
      model: modelId,
      messages: finalMessages,
      stream: true,
      streamOptions: { includeUsage: true },
    });

    let fullResponse = "";
    let totalTokens = 0;

    return streamSSE(c, async (sse) => {
      await sse.writeSSE({
        event: "message_start",
        data: "message_start",
        id: String(id++),
      });

      await sse.writeSSE({
        event: "conversation_id",
        data: JSON.stringify({
          conversationId: finalConversationId,
        }),
        id: String(id++),
      });

      for await (const chunk of aiStream) {
        const content = chunk.choices?.[0]?.delta?.content;

        if (content) {
          fullResponse += content;

          await sse.writeSSE({
            event: "content_block_delta",
            data: content,
            id: String(id++),
          });
        }

        if (chunk.usage) {
          totalTokens += chunk.usage.totalTokens ?? 0;

          await sse.writeSSE({
            event: "usage",
            data: JSON.stringify(chunk.usage),
            id: String(id++),
          });
        }
      }

      await prisma.message.create({
        data: {
          conversationId: finalConversationId,
          role: "ai",
          response: fullResponse,
          modelName: modelId,
        },
      });

      const messageCount = await prisma.message.count({
        where: {
          conversationId: finalConversationId,
        },
      });

      if (messageCount >= 3) {
        const oldMessages = await prisma.message.findMany({
          where: {
            conversationId: finalConversationId,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: messageCount - 5,
        });

        if (oldMessages.length > 0) {
          const summaryPrompt: Message[] = [
            {
              role: "system",
              content:
                "You are a conversation memory summarizer. Merge the existing summary " +
                "with the new messages into a concise updated summary under 120 words. " +
                "Remove redundancy. Return ONLY the summary text.",
            },
            {
              role: "user",
              content: `
Existing summary:
${conversation.summary || "None"}

New messages:
${recentMessages.map((m) => `${m.role}: ${m.response}`).join("\n")}
`,
            },
          ];

          const summaryResponse = await openRouterClient.chat.send({
            model: "mistralai/devstral-2512:free",
            messages: summaryPrompt,
            stream: false,
          });

          const rawContent = summaryResponse.choices?.[0]?.message?.content;

          const newSummary =
            typeof rawContent === "string"
              ? rawContent
              : rawContent
                  ?.map((c) => ("text" in c ? c.text : ""))
                  .join("")
                  .trim();

          if (newSummary) {
            await prisma.conversation.update({
              where: {
                id: finalConversationId,
              },
              data: {
                summary: newSummary,
              },
            });

            const idsToDelete = oldMessages.map((m) => m.id);

            await prisma.message.deleteMany({
              where: { id: { in: idsToDelete } },
            });
          }
        }
      }

      if (billingMode === "CREDITS") {
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { decrement: 1 } },
        });
      }

      await sse.writeSSE({
        event: "message_stop",
        data: "message_stop",
        id: String(id++),
      });
    });
  } catch (error) {
    logger.error({ error }, "Error in conversationChatController controller");
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
