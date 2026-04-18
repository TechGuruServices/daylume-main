import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import type { Message } from "@shared/schema";

export default function Chat() {
  const [input, setInput] = useState("");
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: [api.ai.messages.path],
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", api.ai.chat.path, { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.ai.messages.path] });
      setInput("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatMutation.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;
    chatMutation.mutate(input);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)]">

      {/* ── Header ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-gradient-animate">
          AI Assistant
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm font-medium leading-relaxed">
          Chat with AI to filter and analyze your Craigslist finds.
        </p>
      </motion.section>

      {/* ── Chat container ── */}
      <div className="flex-1 flex flex-col glass-card rounded-3xl overflow-hidden relative">

        {/* Ambient blurs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Chat title bar */}
        <div className="border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-md z-10 px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/10 border border-blue-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-display font-bold text-base text-foreground">Craigs-Catch AI</span>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1 px-4 py-5 z-10">
          <div className="space-y-4">
            {messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex gap-3 max-w-[85%] ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-blue-500 to-violet-600 border-blue-500/30 text-white"
                        : "bg-white/[0.05] border-white/[0.08] text-blue-400"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 border text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-500/10 border-blue-500/15 text-foreground"
                        : "bg-white/[0.03] border-white/[0.06] text-foreground/90"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {chatMutation.isPending && (
              <div className="flex justify-start animate-fade-up">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] text-blue-400 flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input bar */}
        <div className="border-t border-white/[0.06] bg-white/[0.02] backdrop-blur-md z-10 px-4 py-3.5">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Craigs-Catch AI…"
              disabled={chatMutation.isPending}
              data-testid="input-chat-message"
              className="input-premium flex-1 rounded-xl py-3"
            />
            <button
              type="submit"
              disabled={chatMutation.isPending}
              data-testid="button-send-message"
              className="btn-primary px-5 rounded-xl"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
