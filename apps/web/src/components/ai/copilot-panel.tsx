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
        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-indigo-600 px-3 py-2 text-white text-xs">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-slate-100 bg-slate-50 px-3 py-2 text-slate-600 text-xs">
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
    <aside className="sticky top-0 flex h-screen w-[320px] shrink-0 flex-col border-slate-100 border-l bg-white p-6">
      <div className="flex items-center gap-2 pb-4">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"
        >
          <i className="ri-sparkling-2-line" />
        </span>
        <h2 className="font-semibold text-slate-900 text-sm">AI Copilot</h2>
        <span className="ml-auto flex items-center gap-1 text-slate-400 text-xs">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-emerald-500"
          />
          Online
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <div className="flex items-center gap-2 border-slate-100 border-t pt-4">
        <Input
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
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={send}
          size="icon"
        >
          <i aria-hidden="true" className="ri-send-plane-2-line text-base" />
        </Button>
      </div>
    </aside>
  );
}
