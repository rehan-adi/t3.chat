import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 py-4 px-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <Bot className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-3',
          isUser
            ? 'bg-chat-user text-chat-user-foreground'
            : 'bg-chat-ai text-chat-ai-foreground'
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {content}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 pl-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 pl-4 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className={cn("block bg-muted/50 p-3 rounded-md text-xs font-mono overflow-x-auto", className)} {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic my-2">{children}</blockquote>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-flex ml-1">
                <span className="animate-pulse-dot">●</span>
              </span>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
