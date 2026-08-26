import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  content: ReactNode;
  from: "copilot" | "user";
  id: number;
}

const WELCOME: ChatMessage[] = [
  {
    content:
      "Hi! I'm your data copilot. Upload a loan tape and I'll help you understand import results, validation failures, and exception patterns.",
    from: "copilot",
    id: 0,
  },
];

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.from === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-white px-3 py-2 text-black text-xs">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-[#27272A] bg-[#18181B] px-3 py-2 text-[#A1A1AA] text-xs">
        {message.content}
      </div>
    </div>
  );
}

export function CopilotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>(WELCOME);
  const [draft, setDraft] = useState("");

  const send = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    setDraft("");
    setMessages((prev) => [
      ...prev,
      { content: text, from: "user", id: Date.now() },
      {
        content:
          "AI assistance arrives in Phase 3 — meanwhile, validation summaries and exception insights are available on your dashboard.",
        from: "copilot",
        id: Date.now() + 1,
      },
    ]);
  };

  return (
    <aside className="sticky top-0 flex h-screen w-[320px] shrink-0 flex-col border-[#27272A] border-l bg-gradient-to-b from-[#8B5CF6]/10 to-transparent p-6">
      <div className="flex items-center gap-2 pb-4">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-lg border border-[#8B5CF6]/30 bg-[#2E1065]/30 text-[#8B5CF6]"
        >
          <i className="ri-sparkling-2-line" />
        </span>
        <h2 className="font-medium text-sm text-white">AI Copilot</h2>
        <span className="ml-auto flex items-center gap-1 text-[#A1A1AA] text-xs">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-emerald-400"
          />
          Online
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <div className="flex items-center gap-2 border-[#27272A] border-t pt-4">
        <Input
          className="border-[#27272A] bg-[#18181B] text-white placeholder:text-[#52525B]"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Ask about your data..."
          value={draft}
        />
        <Button
          aria-label="Send message"
          className="bg-white text-black hover:bg-gray-200"
          onClick={send}
          size="icon"
        >
          <i aria-hidden="true" className="ri-send-plane-2-line text-base" />
        </Button>
      </div>
    </aside>
  );
}
