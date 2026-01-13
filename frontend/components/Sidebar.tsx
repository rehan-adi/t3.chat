"use client";

import axios from "axios";
import { useEffect, useState } from "react";

type Conversation = {
  id: string;
  title: string;
};

interface SidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function Sidebar({
  selectedConversationId,
  onSelectConversation,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
        {
          withCredentials: true,
        }
      );

      if (res.data.success) {
        setConversations(res.data.data.conversation || []);
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  };

  return (
    <aside className="w-[260px] min-w-[260px] bg-[#161014] text-gray-200 flex flex-col border-r border-gray-800">
      <div className="p-4 font-semibold text-sm border-b border-gray-800">
        Chat
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-xs text-gray-500 px-3 py-2">No conversations</p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectConversation(c.id)}
              className={`cursor-pointer px-4 py-2 rounded-md text-sm hover:bg-[#1f1b19] transition ${
                selectedConversationId === c.id
                  ? "bg-[#A2014D] text-[#FBD0E8]"
                  : ""
              }`}
            >
              {c.title}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
