import { cn } from "@/lib/utils";
import { MessageSquare, Pin, Trash2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { EditTitleModal } from "./EditTitleModal";

interface Conversation {
  id: string;
  title: string;
  pinned?: boolean;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onUpdateTitle: (id: string, title: string) => Promise<void>;
  userDetails: any;
}

export function Sidebar({
  userDetails,
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onTogglePin,
  onUpdateTitle,
}: SidebarProps) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Separate pinned and unpinned conversations
  const pinnedConversations = conversations.filter((c) => c.pinned);
  const unpinnedConversations = conversations.filter((c) => !c.pinned);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetId(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await onDeleteConversation(deleteTargetId);
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handleEditClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTargetId(id);
    setEditModalOpen(true);
  };

  const handleEditSave = async (title: string) => {
    if (editTargetId) {
      setIsUpdating(true);
      try {
        await onUpdateTitle(editTargetId, title);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handlePinClick = async (id: string, pinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    await onTogglePin(id, pinned);
  };

  const getConversationTitle = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    return conv?.title || "";
  };

  const renderConversationItem = (conversation: Conversation) => {
    const isHovered = hoveredId === conversation.id;
    const isActive = activeConversationId === conversation.id;

    return (
      <motion.div
        key={conversation.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onMouseEnter={() => setHoveredId(conversation.id)}
        onMouseLeave={() => setHoveredId(null)}
        className="relative group"
      >
        <button
          onClick={() => onSelectConversation(conversation.id)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-all duration-200",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50",
          )}
        >
          {conversation.pinned ? (
            <Pin className="h-3.5 w-3.5 flex-shrink-0 text-[#A2014D] fill-[#A2014D]" />
          ) : (
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="truncate flex-1">{conversation.title}</span>

          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-70 hover:opacity-100 hover:bg-sidebar-accent"
                  onClick={(e) => handlePinClick(conversation.id, !conversation.pinned, e)}
                  title={conversation.pinned ? "Unpin" : "Pin"}
                >
                  <Pin
                    className={cn(
                      "h-3.5 w-3.5",
                      conversation.pinned && "fill-current text-[#A2014D]",
                    )}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-70 hover:opacity-100 hover:bg-sidebar-accent"
                  onClick={(e) => handleEditClick(conversation.id, e)}
                  title="Edit title"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-70 hover:opacity-100 hover:bg-sidebar-accent text-destructive hover:text-destructive"
                  onClick={(e) => handleDeleteClick(conversation.id, e)}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </motion.div>
    );
  };

  return (
    <>
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
            {/* Pinned Section */}
            {pinnedConversations.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground px-3 py-1.5 uppercase tracking-wider">
                  Pinned
                </p>
                <div className="space-y-1">
                  <AnimatePresence>
                    {pinnedConversations.map(renderConversationItem)}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Unpinned Section */}
            {unpinnedConversations.length > 0 && (
              <div className="space-y-1">
                <AnimatePresence>
                  {unpinnedConversations.map(renderConversationItem)}
                </AnimatePresence>
              </div>
            )}

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

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        conversationTitle={getConversationTitle(deleteTargetId || "")}
        onConfirm={handleDeleteConfirm}
      />

      <EditTitleModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        currentTitle={getConversationTitle(editTargetId || "")}
        onSave={handleEditSave}
        isSaving={isUpdating}
      />
    </>
  );
}
