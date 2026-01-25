import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Conversation {
  id: string;
  title: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  userDetails: any;
}

export function Sidebar({
  userDetails,
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
}: SidebarProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full w-64 bg-sidebar border-r border-sidebar-border">
      <div className="p-4 border-b flex flex-col justify-center items-center border-sidebar-border">
        <h1 className="mb-3">T3.CHAT</h1>
        <Button
          onClick={onNewChat}
          className="w-full justify-center bg-[#40182B] text-sm text-[#F0BED9] border border-[#531E33] font-medium"
          variant="default"
          size="sm"
        >
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                activeConversationId === conversation.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
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

      <div
        onClick={() => navigate("/settings")}
        className="flex justify-start items-center px-2 py-2.5 mx-5 hover:bg-[#271923] gap-3 mb-5 rounded-lg cursor-pointer"
      >
        <img
          src="https://workoscdn.com/images/v1/PIC-5rXqMSpusptX5SR9E3fV_mUcsxIB5smv5p-pWiY"
          alt="Profile Picture"
          className="w-8 h-8 rounded-full"
        />
        {userDetails && (
          <div className="flex flex-col">
            <h1 className="text-sm">{userDetails.name}</h1>
            <p className="text-xs">
              {userDetails.isPremium ? "Premium" : "Free"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
