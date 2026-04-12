import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import type { Message } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
    <div className="container mx-auto max-w-5xl h-[calc(100vh-10rem)] animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-extrabold tracking-tight text-gradient-sapphire animate-gradient-flow bg-300%">
          AI Assistant
        </h1>
        <p className="text-muted-foreground mt-2 text-lg font-medium">Chat with AI to filter and analyze your Craigslist finds.</p>
      </div>

      <Card className="h-full flex flex-col glass-ultra border-white/5 rounded-3xl overflow-hidden relative shadow-2xl">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

        <CardHeader className="border-b border-white/5 glass-card-premium z-10 px-8 py-6">
          <CardTitle className="flex items-center gap-3 text-gradient-sapphire">
            <div className="glass-card-premium p-2.5 rounded-xl border border-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover-lift">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <span className="font-display font-bold text-2xl tracking-wide text-foreground">CraigsCatch AI</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0 z-10">
          <ScrollArea className="h-full px-8 py-6 scrollbar-premium">
            <div className="space-y-6">
              {messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex gap-4 max-w-[85%] ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border hover-lift ${
                      msg.role === "user"
                        ? "glass-card-premium text-white animate-gradient-flow"
                        : "glass-card-subtle text-primary"
                    }`}>
                      {msg.role === "user" ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <Bot className="w-5 h-5" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-6 py-4 shadow-sm border hover-lift ${
                        msg.role === "user"
                          ? "glass-card-subtle border-primary/20 text-foreground"
                          : "glass-card-premium text-foreground/90"
                      }`}
                    >
                      <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex justify-start animate-in fade-in duration-300">
                  <div className="flex gap-4 max-w-[80%]">
                    <div className="w-10 h-10 rounded-2xl glass-card-subtle text-primary flex items-center justify-center shrink-0 shadow-lg animate-pulse">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="glass-card-premium rounded-2xl px-6 py-4 shadow-sm border">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"></span>
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="border-t border-white/5 glass-card-premium z-10 px-8 py-5">
          <form onSubmit={handleSubmit} className="flex w-full gap-4 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask CraigsCatch AI..."
              disabled={chatMutation.isPending}
              data-testid="input-chat-message"
              className="h-14 rounded-2xl glass-card-subtle border-white/10 focus-visible:ring-primary/50 px-6 text-base tracking-wide shadow-inner hover-lift transition-all"
            />
            <Button
              type="submit"
              disabled={chatMutation.isPending}
              data-testid="button-send-message"
              className="h-14 px-8 rounded-2xl glass-card-premium text-primary-foreground shadow-lg shadow-primary/20 hover-lift active-press animate-gradient-flow font-bold"
            >
              <Send className="w-5 h-5 mr-2" />
              Send
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
