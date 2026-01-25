import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatInput } from "@/components/chat/ChatInput";
import { useState, useEffect, useCallback } from "react";
import { conversationsApi, Conversation } from "@/lib/api";
import { ChatWindow, ChatMessage } from "@/components/chat/ChatWindow";
import { sendMessageWithSSE, sendNewConversationMessage } from "@/lib/sse";

export default function Chat() {
  const [userDetails, setUserDetails] = useState<any>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await conversationsApi.list();

        setUserDetails(data.user);
        setConversations(data.conversations);
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      }
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const conversation = await conversationsApi.get(activeConversationId);
        setMessages(
          conversation.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })),
        );
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        setMessages([]);
        setMessages([
          {
            id: "error",
            role: "assistant",
            content: "Failed to load conversation. Please try again.",
          },
        ]);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [activeConversationId]);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setIsSidebarOpen(false);
  }, []);

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === activeConversationId) return; // Don't reload if already selected
      setActiveConversationId(id);
      setIsSidebarOpen(false);
    },
    [activeConversationId],
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await conversationsApi.delete(id);
        // If deleted conversation was active, clear it
        if (id === activeConversationId) {
          setActiveConversationId(null);
          setMessages([]);
        }
        // Refresh conversations list
        const data = await conversationsApi.list();
        setConversations(data.conversations);
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        // Could show a toast notification here
      }
    },
    [activeConversationId],
  );

  const handleTogglePin = useCallback(async (id: string, pinned: boolean) => {
    try {
      await conversationsApi.togglePin(id, pinned);
      // Refresh conversations list to get updated pin status
      const data = await conversationsApi.list();
      setConversations(data.conversations);
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  }, []);

  const handleUpdateTitle = useCallback(
    async (id: string, title: string) => {
      try {
        await conversationsApi.update(id, title);
        // Refresh conversations list to get updated title
        const data = await conversationsApi.list();
        setConversations(data.conversations);
        // If it's the active conversation, update the title in the UI
        if (id === activeConversationId) {
          // Title will be updated when we refresh the list
        }
      } catch (error) {
        console.error("Failed to update title:", error);
        throw error;
      }
    },
    [activeConversationId],
  );

  const handleSendMessage = useCallback(
    async (content: string, modelId: string) => {
      if (isStreaming) return;

      // Add user message
      const userMessageId = `user-${Date.now()}`;
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      // Add placeholder AI message
      const aiMessageId = `ai-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: "assistant",
          content: "",
          isStreaming: true,
        },
      ]);

      const handleToken = (token: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId ? { ...m, content: m.content + token } : m,
          ),
        );
      };

      const handleDone = (conversationId?: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId ? { ...m, isStreaming: false } : m,
          ),
        );
        setIsStreaming(false);

        // If new conversation, update state
        if (conversationId && !activeConversationId) {
          setActiveConversationId(conversationId);
          // Refresh conversations list
          conversationsApi.list().then(setConversations).catch(console.error);
        }
      };

      const handleError = (error: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? { ...m, content: `Error: ${error}`, isStreaming: false }
              : m,
          ),
        );
        setIsStreaming(false);
      };

      if (activeConversationId) {
        await sendMessageWithSSE(
          activeConversationId,
          content,
          modelId,
          handleToken,
          () => handleDone(),
          handleError,
        );
      } else {
        await sendNewConversationMessage(
          content,
          modelId,
          handleToken,
          handleDone,
          handleError,
        );
      }
    },
    [activeConversationId, isStreaming],
  );

  return (
    <div className="flex h-screen bg-background">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 lg:relative lg:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar
          conversations={conversations.map((c) => ({
            id: c.id,
            title: c.title,
            pinned: c.pinned,
          }))}
          activeConversationId={activeConversationId || undefined}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onTogglePin={handleTogglePin}
          onUpdateTitle={handleUpdateTitle}
          userDetails={userDetails}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden border-b border-border p-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <h1 className="font-medium">Chat</h1>
        </header>

        {/* Chat area */}
        <ChatWindow
          messages={messages}
          isLoading={
            (isStreaming && messages.length === 0) || isLoadingMessages
          }
        />

        <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
}
