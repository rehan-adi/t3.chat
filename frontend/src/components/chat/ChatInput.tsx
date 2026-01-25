import { Send, Search, Paperclip, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "deepseek-r1", label: "DeepSeek R1" },
];

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Type your message here...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-[#231C26]">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg border border-input bg-[#231C26] p-2">
          {/* TEXT INPUT */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent px-2 py-1.5 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px] max-h-[200px]"
          />

          {/* BOTTOM BAR */}
          <div className="mt-2 flex items-center justify-between">
            {/* LEFT ACTIONS */}
            <div className="flex items-center gap-1">
              {/* MODEL SELECT */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    {model.label}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {MODELS.map((m) => (
                    <DropdownMenuItem key={m.id} onClick={() => setModel(m)}>
                      {m.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* SEARCH */}
              <Button variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>

              {/* FILE UPLOAD */}
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    console.log("Selected file:", file);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            {/* SEND BUTTON */}
            <Button
              onClick={handleSend}
              disabled={disabled || !value.trim()}
              size="icon"
              className="h-9 w-9"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
