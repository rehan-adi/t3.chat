const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface SSEMessage {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
}

export async function sendMessageWithSSE(
  conversationId: string,
  message: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      credentials: 'include',
      body: JSON.stringify({ content: message }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/signin';
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onDone();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            onDone();
            return;
          }

          try {
            const parsed: SSEMessage = JSON.parse(data);
            
            if (parsed.type === 'token' && parsed.content) {
              onToken(parsed.content);
            } else if (parsed.type === 'done') {
              onDone();
              return;
            } else if (parsed.type === 'error' && parsed.error) {
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
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Unknown error');
  }
}

// Alternative: Create a new conversation and send message
export async function sendNewConversationMessage(
  message: string,
  onToken: (token: string) => void,
  onDone: (conversationId: string) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      credentials: 'include',
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/signin';
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get conversation ID from response headers if available
    const conversationId = response.headers.get('X-Conversation-Id') || '';

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onDone(conversationId);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            onDone(conversationId);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'token' && parsed.content) {
              onToken(parsed.content);
            } else if (parsed.type === 'done') {
              onDone(parsed.conversationId || conversationId);
              return;
            } else if (parsed.type === 'error' && parsed.error) {
              onError(parsed.error);
              return;
            }
          } catch {
            if (data.trim()) {
              onToken(data);
            }
          }
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Unknown error');
  }
}
