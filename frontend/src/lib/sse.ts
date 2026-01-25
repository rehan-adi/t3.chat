const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export interface SSEMessage {
  type: "token" | "done" | "error";
  content?: string;
  error?: string;
}

export async function sendMessageWithSSE(
  conversationId: string,
  message: string,
  modelId: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/conversations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        credentials: "include",
        body: JSON.stringify({
          conversationId,
          prompt: message,
          model: modelId,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/signin";
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onDone();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = line.slice(6);

          if (data === "[DONE]") {
            onDone();
            return;
          }

          // Handle different event types from backend
          if (currentEvent === "content_block_delta") {
            // This is the token content - send it directly if not empty
            if (data && data.trim()) {
              onToken(data);
            }
          } else if (currentEvent === "conversation_id") {
            // Conversation ID is sent, but we already have it for existing conversations
            // This is mainly useful for new conversations
            try {
              const parsed = JSON.parse(data);
              if (parsed.conversationId) {
                // Could be used to update conversation ID if needed
              }
            } catch {
              // Ignore parsing errors
            }
          } else if (currentEvent === "message_start") {
            // Message started, nothing to do
          } else if (currentEvent === "usage") {
            // Usage data, can be ignored for now
          } else if (!currentEvent) {
            // No event specified, try to parse as JSON or treat as plain text
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "token" && parsed.content) {
                onToken(parsed.content);
              } else if (parsed.type === "done") {
                onDone();
                return;
              } else if (parsed.type === "error" && parsed.error) {
                onError(parsed.error);
                return;
              }
            } catch {
              // If not JSON, treat as plain text token
              if (data.trim()) {
                onToken(data);
              }
            }
          }

          // Don't reset currentEvent here - it might be used for next data line
        } else if (line.trim() === "") {
          // Empty line indicates end of event block, reset event
          currentEvent = "";
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : "Unknown error");
  }
}

// Alternative: Create a new conversation and send message
export async function sendNewConversationMessage(
  message: string,
  modelId: string,
  onToken: (token: string) => void,
  onDone: (conversationId: string) => void,
  onError: (error: string) => void,
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      credentials: "include",
      body: JSON.stringify({
        prompt: message,
        model: modelId,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/signin";
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get conversation ID from response headers if available
    const conversationId = response.headers.get("X-Conversation-Id") || "";

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";
    let newConversationId = conversationId;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onDone(newConversationId);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = line.slice(6);

          if (data === "[DONE]") {
            onDone(newConversationId);
            return;
          }

          // Handle different event types from backend
          if (currentEvent === "content_block_delta") {
            // This is the token content - send it directly if not empty
            if (data && data.trim()) {
              onToken(data);
            }
          } else if (currentEvent === "conversation_id") {
            // Extract conversation ID for new conversations
            try {
              const parsed = JSON.parse(data);
              if (parsed.conversationId) {
                newConversationId = parsed.conversationId;
              }
            } catch {
              // Ignore parsing errors
            }
          } else if (currentEvent === "message_start") {
            // Message started, nothing to do
          } else if (currentEvent === "usage") {
            // Usage data, can be ignored for now
          } else if (!currentEvent) {
            // No event specified, try to parse as JSON or treat as plain text
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "token" && parsed.content) {
                onToken(parsed.content);
              } else if (parsed.type === "done") {
                onDone(parsed.conversationId || newConversationId);
                return;
              } else if (parsed.type === "error" && parsed.error) {
                onError(parsed.error);
                return;
              }
            } catch {
              // If not JSON, treat as plain text token
              if (data.trim()) {
                onToken(data);
              }
            }
          }

          // Don't reset currentEvent here - it might be used for next data line
        } else if (line.trim() === "") {
          // Empty line indicates end of event block, reset event
          currentEvent = "";
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : "Unknown error");
  }
}
