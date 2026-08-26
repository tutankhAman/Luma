import type { ReactNode } from "react";
import { useState } from "react";
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
      <div className="m-4 mt-0 flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-[#27272A] bg-white px-4 py-3 text-[13px] text-black leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="m-4 mt-0 flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#27272A] bg-[#18181B] p-4 text-[#A1A1AA] text-[13px] leading-relaxed">
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
    <aside className="sticky top-0 flex h-screen w-[320px] shrink-0 flex-col border-[#27272A] border-l bg-[#09090B]">
      <div className="flex items-center justify-between border-[#27272A] border-b p-4">
        <h2 className="flex items-center gap-2 font-medium text-sm text-white">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-lg border border-[#8B5CF6]/30 bg-[#2E1065]/30 text-[#8B5CF6]"
          >
            <i className="ri-sparkling-2-line" />
          </span>
          AI Copilot
        </h2>
        <span className="flex items-center gap-1 text-[#A1A1AA] text-xs">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-emerald-400"
          />
          Online
        </span>
      </div>

      <div className="custom-scrollbar-hide flex-1 overflow-y-auto pt-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <div className="p-4">
        <Input
          className="rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3 text-[13px] text-white placeholder:text-[#52525B]"
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
      </div>
    </aside>
  );
}
