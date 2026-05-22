import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { useGetThread, useSendMessage } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User as UserIcon, Bot, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/react";

export default function ChatPage() {
  const { threadId } = useParams();
  const { user } = useUser();
  const { data: thread, isLoading } = useGetThread(threadId || "", { query: { enabled: !!threadId } });
  const sendMessage = useSendMessage();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  const handleSend = () => {
    if (!input.trim() || !threadId) return;
    sendMessage.mutate({ 
      threadId, 
      data: { content: input } 
    });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "frontier": return <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">Frontier Agent</Badge>;
      case "developer": return <Badge className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">Developer Agent</Badge>;
      case "sales": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Sales Agent</Badge>;
      case "support": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Support Agent</Badge>;
      case "sme": return <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20">SME Agent</Badge>;
      default: return <Badge variant="outline" className="capitalize">{role} Agent</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            {isLoading ? <Skeleton className="h-6 w-40" /> : (
              <>
                <h2 className="font-semibold text-lg">{thread?.title || "New Conversation"}</h2>
                {thread?.role && getRoleBadge(thread.role)}
              </>
            )}
          </div>
          <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex justify-end"><Skeleton className="h-16 w-1/2 rounded-2xl rounded-tr-sm" /></div>
              <div className="flex"><Skeleton className="h-32 w-2/3 rounded-2xl rounded-tl-sm" /></div>
            </div>
          ) : (
            thread?.messages?.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {isUser ? <UserIcon className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted border border-border rounded-tl-sm"}`}>
                    {!isUser && thread?.role && (
                      <div className="text-xs font-medium text-muted-foreground mb-1 capitalize">
                        {thread.role} Agent
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                  </div>
                </div>
              );
            })
          )}
          {sendMessage.isPending && (
             <div className="flex gap-4">
                <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]"></div>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-background">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="min-h-[60px] max-h-[200px] pr-12 resize-none"
              disabled={isLoading || sendMessage.isPending}
            />
            <Button 
              size="icon" 
              className="absolute right-2 bottom-2 h-8 w-8"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || sendMessage.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center mt-2 text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for newline
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
