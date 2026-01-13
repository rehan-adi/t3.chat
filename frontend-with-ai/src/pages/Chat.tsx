import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatWindow, ChatMessage } from '@/components/chat/ChatWindow';
import { ChatInput } from '@/components/chat/ChatInput';
import { creditApi, conversationsApi, CreditInfo, Conversation } from '@/lib/api';
import { sendMessageWithSSE, sendNewConversationMessage } from '@/lib/sse';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [credits, setCredits] = useState<CreditInfo>({ remaining: 0, total: 0 });
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch credits on mount
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const data = await creditApi.getCredits();
        setCredits(data);
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      } finally {
        setIsLoadingCredits(false);
      }
    };
    fetchCredits();
  }, []);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await conversationsApi.list();
        setConversations(data);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      }
    };
    fetchConversations();
  }, []);

  // Load conversation messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const conversation = await conversationsApi.get(activeConversationId);
        setMessages(
          conversation.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };
    fetchMessages();
  }, [activeConversationId]);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setIsSidebarOpen(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setIsSidebarOpen(false);
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    if (isStreaming) return;

    // Add user message
    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
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
        role: 'assistant',
        content: '',
        isStreaming: true,
      },
    ]);

    const handleToken = (token: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? { ...m, content: m.content + token }
            : m
        )
      );
    };

    const handleDone = (conversationId?: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId ? { ...m, isStreaming: false } : m
        )
      );
      setIsStreaming(false);

      // Refresh credits
      creditApi.getCredits().then(setCredits).catch(console.error);

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
            : m
        )
      );
      setIsStreaming(false);
    };

    if (activeConversationId) {
      await sendMessageWithSSE(
        activeConversationId,
        content,
        handleToken,
        () => handleDone(),
        handleError
      );
    } else {
      await sendNewConversationMessage(
        content,
        handleToken,
        handleDone,
        handleError
      );
    }
  }, [activeConversationId, isStreaming]);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 lg:relative lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          conversations={conversations.map((c) => ({ id: c.id, title: c.title }))}
          activeConversationId={activeConversationId || undefined}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          credits={credits}
          isLoadingCredits={isLoadingCredits}
        />
      </div>

      {/* Main content */}
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
        <ChatWindow messages={messages} isLoading={isStreaming && messages.length === 0} />
        <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
}
