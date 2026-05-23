import { useState, useRef, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/app-layout";
import { useGetThread, useListOrgs, useListModelConfigs, useUpdateThreadTitle, getGetThreadQueryKey } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User as UserIcon, ChevronLeft, ChevronRight, Plus, MoreVertical, Pencil, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

// Role definitions
const ROLE_CONFIG: Record<string, { label: string; color: string; bgClass: string; textClass: string; borderClass: string }> = {
  frontier: { label: "Frontier", color: "indigo", bgClass: "bg-indigo-500/10", textClass: "text-indigo-400", borderClass: "border-indigo-500/30" },
  developer: { label: "Developer", color: "cyan", bgClass: "bg-cyan-500/10", textClass: "text-cyan-400", borderClass: "border-cyan-500/30" },
  sales: { label: "Sales", color: "emerald", bgClass: "bg-emerald-500/10", textClass: "text-emerald-400", borderClass: "border-emerald-500/30" },
  support: { label: "Support", color: "amber", bgClass: "bg-amber-500/10", textClass: "text-amber-400", borderClass: "border-amber-500/30" },
  sme: { label: "SME", color: "violet", bgClass: "bg-violet-500/10", textClass: "text-violet-400", borderClass: "border-violet-500/30" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, bgClass: "bg-muted", textClass: "text-muted-foreground", borderClass: "border-border" };
  return (
    <Badge className={cn("text-xs font-medium border", cfg.bgClass, cfg.textClass, cfg.borderClass)}>
      {cfg.label} Agent
    </Badge>
  );
}

// Org carousel chip
function OrgCarousel({ orgs, selectedOrgId, onSelect }: { orgs: any[]; selectedOrgId?: string | null; onSelect: (id: string | null) => void }) {
  const [offset, setOffset] = useState(0);
  const visible = 4;
  const canPrev = offset > 0;
  const canNext = offset + visible < orgs.length;

  const sliced = orgs.slice(offset, offset + visible);

  return (
    <div className="flex items-center gap-1 overflow-hidden">
      <button
        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
        onClick={() => setOffset(Math.max(0, offset - 1))}
        disabled={!canPrev}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {sliced.map((org) => {
        const isActive = org.id === selectedOrgId;
        const isConnected = org.status === "connected";
        return (
          <button
            key={org.id}
            onClick={() => onSelect(isActive ? null : org.id)}
            className={cn(
              "h-7 px-3 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 whitespace-nowrap",
              isActive
                ? "bg-primary/15 text-primary border-primary/40"
                : "bg-muted/50 text-muted-foreground border-border hover:border-border/80 hover:text-foreground",
              !isConnected && "opacity-50",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-emerald-500" : "bg-slate-500")} />
            {org.label}
          </button>
        );
      })}
      <button
        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
        onClick={() => setOffset(Math.min(orgs.length - visible, offset + 1))}
        disabled={!canNext}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Simple markdown-like renderer for agent messages
function MessageContent({ content }: { content: string }) {
  // Render code blocks, bold, and newlines simply
  const lines = content.split("\n");
  let inCode = false;
  const rendered: JSX.Element[] = [];

  let codeLines: string[] = [];
  let blockIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeLines = [];
      } else {
        inCode = false;
        rendered.push(
          <pre key={`code-${blockIdx++}`} className="my-2 p-3 bg-background border border-border rounded-md overflow-x-auto text-xs font-mono text-foreground">
            {codeLines.join("\n")}
          </pre>
        );
        codeLines = [];
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }
    if (!line.trim()) {
      rendered.push(<div key={`br-${i}`} className="h-2" />);
      continue;
    }
    // Bold **text**
    const withBold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Inline code `text`
    const withCode = withBold.replace(/`([^`]+)`/g, '<code class="font-mono text-xs bg-background border border-border rounded px-1 py-0.5">$1</code>');
    rendered.push(
      <p key={`line-${i}`} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: withCode }} />
    );
  }

  return <div className="space-y-0.5">{rendered}</div>;
}

function StreamingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function ChatPage() {
  const { threadId } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: threadData, isLoading } = useGetThread(threadId || "");
  const { data: orgs = [] } = useListOrgs();
  const { data: models = [] } = useListModelConfigs();

  const [input, setInput] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const updateTitle = useUpdateThreadTitle();

  const thread = threadData?.thread;
  const messages = threadData?.messages ?? [];

  // Sync org from thread
  useEffect(() => {
    if (thread?.orgId && !selectedOrgId) {
      setSelectedOrgId(thread.orgId);
    }
  }, [thread?.orgId]);

  useEffect(() => {
    if (thread?.title) setTitleValue(thread.title);
  }, [thread?.title]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !threadId || isStreaming) return;
    const msg = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    // Optimistically add user message to cache
    queryClient.setQueryData(getGetThreadQueryKey(threadId), (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: [...old.messages, { id: `opt-${Date.now()}`, threadId, role: "user", content: msg, createdAt: new Date().toISOString() }],
      };
    });

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const token = await getClerkToken();
      const res = await fetch(`/api/chat/${threadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: msg, orgId: selectedOrgId }),
        signal: ctrl.signal,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accum = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === "text") {
                accum += parsed.content;
                setStreamingContent(accum);
              } else if (parsed.type === "done") {
                // Refresh thread data
                queryClient.invalidateQueries({ queryKey: getGetThreadQueryKey(threadId) });
              } else if (parsed.type === "error") {
                accum = parsed.content;
                setStreamingContent(accum);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        const errMsg = "Failed to get response. Check your model configuration.";
        setStreamingContent(errMsg);
        queryClient.invalidateQueries({ queryKey: getGetThreadQueryKey(threadId) });
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      queryClient.invalidateQueries({ queryKey: getGetThreadQueryKey(threadId) });
    }
  }, [input, threadId, isStreaming, selectedOrgId, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const saveTitle = () => {
    if (!threadId || !titleValue.trim()) return;
    updateTitle.mutate({ threadId, data: { title: titleValue.trim() } }, {
      onSuccess: () => { setEditingTitle(false); queryClient.invalidateQueries({ queryKey: getGetThreadQueryKey(threadId) }); },
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
          {isLoading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {thread?.role && <RoleBadge role={thread.role} />}
              {editingTitle ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    value={titleValue}
                    onChange={e => setTitleValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                    className="flex-1 bg-transparent border-b border-primary text-sm outline-none text-foreground min-w-0"
                    autoFocus
                  />
                  <button onClick={saveTitle} className="p-1 text-emerald-500 hover:text-emerald-400"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setEditingTitle(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <h2 className="font-semibold text-sm truncate">{thread?.title || "New Conversation"}</h2>
                  <button onClick={() => setEditingTitle(true)} className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 shrink-0">
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Org carousel */}
          {orgs.length > 0 && (
            <OrgCarousel orgs={orgs} selectedOrgId={selectedOrgId} onSelect={setSelectedOrgId} />
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex justify-end"><Skeleton className="h-14 w-1/2 rounded-2xl rounded-tr-sm" /></div>
              <div className="flex"><Skeleton className="h-24 w-2/3 rounded-2xl rounded-tl-sm" /></div>
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-16">
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center",
                thread?.role ? ROLE_CONFIG[thread.role]?.bgClass : "bg-muted"
              )}>
                <Bot className={cn("h-6 w-6", thread?.role ? ROLE_CONFIG[thread.role]?.textClass : "text-muted-foreground")} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{thread?.role ? `${ROLE_CONFIG[thread.role]?.label} Agent` : "Agent"} ready</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {thread?.role === "frontier" && "Ask me anything — from architecture analysis to full feature implementation."}
                  {thread?.role === "developer" && "Describe a feature or config change and I'll build a plan for you."}
                  {thread?.role === "sales" && "Ask about your pipeline, leads, opportunities, or forecast."}
                  {thread?.role === "support" && "Ask about cases, SLAs, knowledge articles, or escalations."}
                  {thread?.role === "sme" && "Ask me to explain anything in your Salesforce org."}
                  {!thread?.role && "Type a message to start."}
                </p>
              </div>
              {!selectedOrgId && orgs.length === 0 && (
                <p className="text-xs text-amber-500/80 border border-amber-500/20 bg-amber-500/5 rounded px-3 py-2 max-w-sm">
                  No Salesforce org connected. Add one in <span className="font-medium">Orgs</span> to enable live data queries.
                </p>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div key={msg.id} className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs",
                      isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      isUser
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted/50 border border-border/60 rounded-tl-sm"
                    )}>
                      {!isUser && thread?.role && (
                        <div className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1.5", ROLE_CONFIG[thread.role]?.textClass ?? "text-muted-foreground")}>
                          {ROLE_CONFIG[thread.role]?.label} Agent
                        </div>
                      )}
                      {isUser
                        ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        : <MessageContent content={msg.content || ""} />
                      }
                    </div>
                  </div>
                );
              })}

              {/* Streaming message */}
              {isStreaming && (
                <div className="flex gap-3">
                  <div className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/50 border border-border/60">
                    {thread?.role && (
                      <div className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1.5", ROLE_CONFIG[thread.role]?.textClass ?? "text-muted-foreground")}>
                        {ROLE_CONFIG[thread.role]?.label} Agent
                      </div>
                    )}
                    {streamingContent
                      ? <MessageContent content={streamingContent} />
                      : <StreamingDots />
                    }
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-background/80 backdrop-blur shrink-0">
          <div className="relative">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? "Agent is thinking..." : "Type your message... (Enter to send, Shift+Enter for newline)"}
              className="min-h-[64px] max-h-[200px] pr-12 resize-none text-sm"
              disabled={isLoading || isStreaming}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isStreaming}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {selectedOrgId && (
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              Connected to: <span className="text-foreground font-medium">{orgs.find(o => o.id === selectedOrgId)?.label}</span>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// Helper to get Clerk token for API calls
async function getClerkToken(): Promise<string | null> {
  try {
    // Clerk sets session cookies automatically; bearer token not needed for cookie-based auth
    return null;
  } catch {
    return null;
  }
}
