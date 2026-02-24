import type { Context } from "hono";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { config } from "@/config/config";
import { redisClient } from "@/lib/redis";
import { MODELS } from "@/contants/models";
import { streamSSE } from "hono/streaming";
import type { Message } from "@openrouter/sdk/models";
import { createOpenRouterClient } from "@/lib/openrouter";
import { userProfilePrompt } from "@/utils/userProfilePrompt";
import { updateConversationSchema } from "@/validations/conversation.validation";

/**
 * @desc Retrieve data for the authenticated user.
 * Returns the user's basic information, all associated profiles,
 * the currently active profile, and all conversations under that profile
 */

export const getAllConversation = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const userWithProfileInfoAndConversations = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        isPremium: true,
        profilePicture: true,
        activeProfileId: true,
        profiles: {
          select: {
            id: true,
            profileName: true,
            isDefault: true, // can be removed
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        activeProfile: {
          select: {
            id: true,
            profileName: true,
            conversations: {
              where: {
                isTemporaryChat: false,
                isArchived: false,
              },
              select: {
                id: true,
                title: true,
                isPinned: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: { updatedAt: "desc" },
            },
          },
        },
      },
    });

    if (!userWithProfileInfoAndConversations) {
      return c.json(
        {
          success: false,
          message: "User not found",
        },
        404,
      );
    }

    if (!userWithProfileInfoAndConversations.activeProfile) {
      return c.json(
        {
          success: false,
          message: "Active profile not set",
        },
        400,
      );
    }

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "Data fetched successfully",
    );

    return c.json(
      {
        success: true,
        message: "Data fetched successfully",
        data: {
          user: {
            id: userWithProfileInfoAndConversations.id,
            name: userWithProfileInfoAndConversations.name,
            isPremium: userWithProfileInfoAndConversations.isPremium,
            profilePicture: userWithProfileInfoAndConversations.profilePicture,
          },
          profiles: userWithProfileInfoAndConversations.profiles,
          activeProfile: {
            id: userWithProfileInfoAndConversations.activeProfile.id,
            profileName:
              userWithProfileInfoAndConversations.activeProfile.profileName,
          },
          conversations:
            userWithProfileInfoAndConversations.activeProfile.conversations,
        },
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
      "getAllConversation controller failed",
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
 * @desc Retrieve a specific conversation along with all its messages.
 * Access is restricted to conversations that belong to a profile
 * owned by the authenticated user.
 */

export const getConversationById = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;
    const conversationId = c.req.param("conversationId");

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        profile: {
          userId: userId,
        },
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
        403,
      );
    }

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        conversationId: conversationId,
      },
      "Fetched conversation successfully",
    );

    return c.json(
      {
        success: true,
        message: "Conversation fetched successfully",
        data: conversation,
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
      "getConversationById controller failed",
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
 * @desc Update the pinned status of a conversation.
 * Ensures the conversation belongs to a profile owned by
 * the authenticated user before applying the change.
 */

export const updateConversationPin = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;
    const conversationId = c.req.param("conversationId");

    const body = await c.req.json<{ isPinned: boolean }>();

    if (typeof body.isPinned !== "boolean") {
      return c.json(
        {
          success: false,
          message: "isPinned value must be boolean",
        },
        400,
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        profile: {
          userId: userId,
        },
      },
      select: {
        id: true,
        isPinned: true,
      },
    });

    if (!conversation) {
      return c.json(
        {
          success: false,
          message: "Conversation not found or does not belong to you",
        },
        403,
      );
    }

    const updatedConversation = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        isPinned: body.isPinned,
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        conversationId: conversationId,
      },
      `Conversation ${body.isPinned ? "pinned" : "unpinned"} successfully`,
    );

    return c.json(
      {
        success: true,
        message: `Conversation ${
          body.isPinned ? "pinned" : "unpinned"
        } successfully`,
        data: updatedConversation,
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
      "updateConversationPin controller failed",
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
 * @desc Rename the title of a conversation.
 * Validates input and ensures the conversation belongs
 * to the authenticated user's profile before updating.
 */

export const renameConversationTitle = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;
    const conversationId = c.req.param("conversationId");

    const body = await c.req.json<{ title: string }>();

    const { success, data } = updateConversationSchema.safeParse(body);

    if (!success) {
      logger.warn({ ip, requestId }, "Title validation failed");
      return c.json(
        {
          success: false,
          message: "Title validation failed",
        },
        400,
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        profile: {
          userId: userId,
        },
      },
      select: { id: true },
    });

    if (!conversation) {
      return c.json(
        {
          success: false,
          message: "Conversation not found or does not belong to you",
        },
        403,
      );
    }

    const updatedConversation = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        title: data.title,
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        conversationId: conversationId,
      },
      "Conversation title updated successfully",
    );

    return c.json(
      {
        success: true,
        message: "Conversation title updated successfully",
        data: updatedConversation,
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
      "updateConversation controller failed",
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
 * @desc Permanently delete a conversation.
 * Ensures the conversation belongs to a profile owned
 * by the authenticated user before removal.
 */

export const deleteConversation = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;
    const conversationId = c.req.param("conversationId");

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        profile: {
          userId: userId,
        },
      },
    });

    if (!conversation) {
      return c.json(
        {
          success: false,
          message: "Conversation not found or does not belong to you",
        },
        403,
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
        conversationId: conversationId,
      },
      "Conversation deleted successfully",
    );

    return c.json(
      {
        success: true,
        message: "Conversation deleted successfully",
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
      "deleteConversation controller failed",
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
 * @desc Process a chat message for a conversation and stream the AI response.
 *
 * - Validates model and billing eligibility (BYOK, Premium, or Credits).
 * - Creates a new conversation if none is provided.
 * - Verifies ownership under the user's active profile.
 * - Persists user and AI messages.
 * - Injects profile customization and conversation memory.
 * - Maintains rolling summary and deducts credits when applicable.
 */

export const conversationChatController = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");
  let id = 0;

  try {
    const body = await c.req.json<{
      conversationId?: string;
      model: string;
      prompt: string;
      isTemporaryChatEnabled: boolean;
    }>();

    const {
      conversationId,
      model: modelId,
      prompt,
      isTemporaryChatEnabled,
    } = body;

    const model = MODELS.find((m) => m.id === modelId);

    if (!model) {
      return c.json(
        {
          success: false,
          message: "Model is not supported",
        },
        400,
      );
    }

    const userId = c.get("user").id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        openRouterApiKey: true,
        activeProfile: true,
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

    if (!user.activeProfileId) {
      return c.json(
        {
          success: false,
          message: "Active profile not set",
        },
        400,
      );
    }

    let apiKeyToUse = config.OPENROUTER_API_KEY;
    let billingMode: "BYOK" | "PREMIUM" | "CREDITS" = "CREDITS";

    if (user.isByokEnabled && user.openRouterApiKey?.key) {
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
          402,
        );
      }
    }

    let finalConversationId = conversationId;

    if (!finalConversationId) {
      let expiresAt = null;

      if (isTemporaryChatEnabled) {
        const now = new Date();
        expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
      }

      const newConv = await prisma.conversation.create({
        data: {
          profileId: user.activeProfileId,
          title: prompt.slice(0, 20) + "...",
          isTemporaryChat: isTemporaryChatEnabled,
          expiresAt,
        },
      });
      finalConversationId = newConv.id;
    }

    const conversation = await prisma.conversation.findUnique({
      where: {
        id: finalConversationId,
      },
      select: {
        profileId: true,
        summary: true,
      },
    });

    if (!conversation || conversation.profileId !== user.activeProfileId) {
      return c.json(
        {
          success: false,
          message: "Conversation does not exist or does not belong to you",
        },
        403,
      );
    }

    const recentMessages = await prisma.message.findMany({
      where: {
        conversationId: finalConversationId,
      },
      orderBy: {
        createdAt: "asc",
      },
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

    const cached = await redisClient.get(
      `profile:customization:${user.activeProfileId}`,
    );

    if (cached) {
      profile = JSON.parse(cached);
    } else {
      profile = await prisma.systemCustomization.findFirst({
        where: { profileId: user.activeProfileId! },
        select: {
          systemName: true,
          systemBio: true,
          systemPrompt: true,
          systemTrait: true,
        },
      });

      if (profile) {
        await redisClient.set(
          `profile:customization:${user.activeProfileId}`,
          JSON.stringify(profile),
          "EX",
          24 * 3600,
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

      if (messageCount >= 8) {
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
${oldMessages.map((m) => `${m.role}: ${m.response}`).join("\n")}
`,
            },
          ];

          const summaryResponse = await openRouterClient.chat.send({
            model: config.CONVERSATION_SUMMARY_MODEL,
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
    logger.error(
      {
        ip,
        requestId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "conversationChatController controller failed",
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
 * @desc Archive a conversation for the authenticated user.
 * Validates ownership of the conversation and marks it as archived.
 * The conversation remains stored but is excluded from active conversation lists.
 */

export const archiveConversation = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;
    const conversationId = c.req.param("conversationId");

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        profile: {
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!conversation) {
      return c.json(
        {
          success: false,
          message: "Conversation not found",
        },
        404,
      );
    }

    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "Conversation archived successfully",
    );
    return c.json(
      {
        success: true,
        message: "Conversation archived successfully",
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
      "archiveConversation controller failed",
    );

    return c.json({ success: false, message: "Internal server error" }, 500);
  }
};

/**
 * @desc Restore an archived conversation for the authenticated user.
 * Validates ownership and marks the conversation as active
 * so it appears again in regular conversation lists.
 */

export const unarchiveConversation = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;
    const conversationId = c.req.param("conversationId");

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        isArchived: true,
        profile: {
          userId,
        },
      },
      select: { id: true },
    });

    if (!conversation) {
      return c.json(
        {
          success: false,
          message: "Conversation not found",
        },
        404,
      );
    }

    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "Conversation unarchived successfully",
    );
    return c.json(
      {
        success: true,
        message: "Conversation unarchived successfully",
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
      "unarchiveConversation controller failed",
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
 * @desc Retrieve all archived conversations for the authenticated user.
 * Fetches archived, non-temporary conversations across all user profiles,
 * ordered by most recently updated.
 */

export const getArchivedConversations = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const archivedConversations = await prisma.conversation.findMany({
      where: {
        isArchived: true,
        isTemporaryChat: false,
        archivedAt: { not: null },
        profile: {
          userId,
        },
      },
      select: {
        id: true,
        title: true,
        archivedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "Archived conversations fetched successfully",
    );
    return c.json(
      {
        success: true,
        message: "Archived conversations fetched successfully",
        data: archivedConversations,
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
      "getAllArchiveConversations controller failed",
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
 * @desc Permanently delete a single archived conversation
 * for the authenticated user.
 * Ensures the conversation belongs to the user and is archived
 * before removing it from the database.
 */

export const deleteArchivedConversation = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;
    const conversationId = c.req.param("conversationId");

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        isArchived: true,
        profile: {
          userId,
        },
      },
      select: { id: true },
    });

    if (!conversation) {
      return c.json(
        {
          success: false,
          message: "Archived conversation not found",
        },
        404,
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
      },
      "Archived conversation deleted successfully",
    );
    return c.json(
      {
        success: true,
        message: "Archived conversation deleted successfully",
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
      "deleteArchiveConversation controller failed",
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
 * @desc Permanently delete all archived conversations
 * across all profiles for the authenticated user.
 * Only archived conversations owned by the user are removed.
 */

export const deleteAllArchivedConversations = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    await prisma.conversation.deleteMany({
      where: {
        isArchived: true,
        archivedAt: { not: null },
        profile: {
          userId: userId,
        },
      },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
      },
      "All archived conversations deleted",
    );

    return c.json(
      {
        success: true,
        message: "All Archive Conversations deleted",
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
      "deleteAllArchiveConversation controller failed",
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
 * @desc Move a conversation from one profile to another for the authenticated user.
 * Validates that both the conversation and the target profile belong to the user.
 * Updates the `profileId` of the conversation to the new profile.
 */

export const moveConversation = async (c: Context) => {
  const ip = c.get("ip");
  const requestId = c.get("requestId");

  try {
    const userId = c.get("user").id;

    const { profileId, conversationId } = await c.req.json<{
      profileId: string;
      conversationId: string;
    }>();

    const targetProfile = await prisma.profile.findUnique({
      where: {
        id: profileId,
        userId: userId,
      },
    });

    if (!targetProfile) {
      return c.json(
        {
          success: false,
          message: "Target profile not found or does not belong to user",
        },
        404,
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        profile: true,
      },
    });

    if (!conversation || conversation.profile.userId !== userId) {
      return c.json(
        {
          success: false,
          message: "Conversation not found or does not belong to user",
        },
        404,
      );
    }

    const updatedConversation = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: { profileId: profileId },
    });

    logger.info(
      {
        ip,
        requestId,
        userId: userId,
        conversationId: conversationId,
        fromProfileId: conversation.profileId,
        toProfileId: profileId,
      },
      "Conversation moved successfully",
    );

    return c.json(
      {
        success: true,
        message: "Conversation moved successfully",
        conversation: updatedConversation,
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
      "moveConversation controller failed",
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
