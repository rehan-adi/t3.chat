"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Chat } from "@/components/Chat";

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get conversationId from URL
  const initialConversationId = searchParams.get("conversationId");
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(initialConversationId);

  // When user selects a conversation, update state AND URL
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    router.push(`/?conversationId=${id}`, { scroll: false });
  };

  return (
    <div className="flex h-screen w-full bg-[#181316]">
      <Sidebar
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
      />
      <div className="flex-1 flex flex-col">
        <Chat conversationId={selectedConversationId} />
      </div>
    </div>
  );
}
