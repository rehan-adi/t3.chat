import { Button } from "@/components/ui/button";
import { modelsApi, type ModelInfo } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Search, Paperclip, ChevronDown, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface ChatInputProps {
  onSend: (message: string, modelId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Type your message here...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch models from backend
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await modelsApi.list();
        if (!mounted) return;

        setModels(data);
        setSelectedModel(data[0] ?? null);
      } catch (err) {
        console.error("Failed to fetch models", err);
      } finally {
        if (mounted) setLoadingModels(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [value]);

  const handleSend = () => {
    if (!value.trim() || !selectedModel || disabled) return;

    onSend(value.trim(), selectedModel.id);
    setValue("");
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
        <motion.div
          layout
          className="rounded-lg border border-input bg-[#231C26] p-2 shadow-sm"
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent px-2 py-1.5 text-sm focus:outline-none disabled:opacity-50 min-h-[36px] max-h-[200px]"
          />

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs font-medium"
                    disabled={loadingModels}
                  >
                    {loadingModels
                      ? "Loading models…"
                      : (selectedModel?.name ?? "Select model")}
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>

                <AnimatePresence>
                  <DropdownMenuContent align="start" asChild>
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="min-w-[220px]"
                    >
                      {models.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => setSelectedModel(model)}
                          className={`flex items-center justify-between ${
                            selectedModel?.id === model.id ? "bg-accent" : ""
                          }`}
                        >
                          <span className="text-sm">{model.name}</span>
                          {model.isPaid && (
                            <Lock className="h-3 w-3 opacity-60" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </motion.div>
                  </DropdownMenuContent>
                </AnimatePresence>
              </DropdownMenu>

              <Button variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>

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

            <Button
              onClick={handleSend}
              disabled={disabled || !value.trim() || !selectedModel}
              size="icon"
              className="h-9 w-9 transition-transform active:scale-95"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
