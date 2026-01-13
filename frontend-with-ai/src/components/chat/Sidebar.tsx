import { Plus, MessageSquare, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreditsBadge } from './CreditsBadge';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';

interface Conversation {
  id: string;
  title: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  credits: { remaining: number; total?: number };
  isLoadingCredits?: boolean;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  credits,
  isLoadingCredits,
}: SidebarProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Still redirect on error
      navigate('/signin');
    }
  };

  return (
    <div className="flex flex-col h-full w-64 bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors',
                activeConversationId === conversation.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{conversation.title}</span>
            </button>
          ))}
          
          {conversations.length === 0 && (
            <p className="text-sm text-muted-foreground px-3 py-2">
              No conversations yet
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <CreditsBadge
          remaining={credits.remaining}
          total={credits.total}
          isLoading={isLoadingCredits}
        />
        
        <div className="space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                Dark Mode
              </>
            )}
          </button>

          <Link
            to="/settings"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
