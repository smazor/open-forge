import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  Settings,
  Trash2,
  Brain,
  Zap,
  Hash,
} from "lucide-react";
import { getAgent } from "../api/client";
import useChat from "../hooks/useChat";

/* ═══════════════════════════════════════════════════════════ */
/*  Main Chat Page                                            */
/* ═══════════════════════════════════════════════════════════ */

export default function Chat() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [input, setInput] = useState("");

  const {
    messages,
    turns,
    isProcessing,
    sendMessage,
    isConnected,
    clearMessages,
  } = useChat(agentId);

  const chatBottomRef = useRef(null);
  const thoughtBottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    getAgent(agentId).then(setAgent).catch(() => {});
  }, [agentId]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Auto-scroll thought panel
  useEffect(() => {
    thoughtBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !isConnected || isProcessing) return;
    sendMessage(input.trim());
    setInput("");
    inputRef.current?.focus();
  };

  // Current (latest) turn for the active processing indicator
  const activeTurn = isProcessing ? turns[turns.length - 1] : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Chat panel (left, 70%) ───────────────────────── */}
      <div className="flex-[7] flex flex-col min-w-0">
        {/* Header */}
        <ChatHeader
          agent={agent}
          agentId={agentId}
          isConnected={isConnected}
          onClear={clearMessages}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1">
          {messages.length === 0 && !isProcessing && (
            <EmptyChat agentName={agent?.name} />
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}

          {/* Inline thinking indicator */}
          {isProcessing && <ThinkingBubble />}

          <div ref={chatBottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="shrink-0 px-6 py-4 border-t border-border bg-surface-raised/50"
        >
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isConnected
                  ? "Type a message..."
                  : "Connecting..."
              }
              disabled={!isConnected}
              className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || !isConnected || isProcessing}
              className="p-2.5 bg-accent rounded-lg text-white hover:bg-accent-dim transition-colors disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {isProcessing && (
            <div className="mt-2 text-[11px] text-text-muted flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-accent" />
              Agent is working...
            </div>
          )}
        </form>
      </div>

      {/* ── Thought process panel (right, 30%) ───────────── */}
      <div className="flex-[3] border-l border-border bg-surface-raised/30 flex flex-col min-w-0">
        <div className="px-4 h-14 flex items-center gap-2.5 border-b border-border shrink-0">
          <Brain className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold">Agent Thought Process</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {turns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Brain className="w-8 h-8 text-text-muted opacity-20 mb-3" />
              <p className="text-xs text-text-muted leading-relaxed">
                The agent's reasoning steps, tool calls, and results will appear
                here in real time.
              </p>
            </div>
          ) : (
            turns.map((turn, i) => (
              <TurnCard key={i} turn={turn} index={i} />
            ))
          )}
          <div ref={thoughtBottomRef} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Chat Header                                               */
/* ═══════════════════════════════════════════════════════════ */

function ChatHeader({ agent, agentId, isConnected, onClear }) {
  return (
    <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-surface-raised/50 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-accent" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">
            {agent?.name ?? `Agent #${agentId}`}
          </div>
          {agent && (
            <div className="text-[11px] text-text-muted truncate">
              {agent.skill_names.length} skill
              {agent.skill_names.length !== 1 && "s"} enabled
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-overlay transition-colors"
          title="Clear chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <Link
          to={`/agents`}
          className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-overlay transition-colors"
          title="Agent settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </Link>
        <div
          className={[
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium",
            isConnected
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger",
          ].join(" ")}
        >
          {isConnected ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {isConnected ? "Live" : "Offline"}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Message Bubbles                                           */
/* ═══════════════════════════════════════════════════════════ */

function MessageBubble({ role, content }) {
  const isUser = role === "user";

  return (
    <div
      className={`animate-bubble-in flex gap-3 py-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={[
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          isUser ? "bg-accent/15" : "bg-surface-overlay",
        ].join(" ")}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-accent" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-text-secondary" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={[
          "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
          isUser
            ? "bg-accent text-white rounded-tr-sm"
            : "bg-surface-raised border border-border rounded-tl-sm",
        ].join(" ")}
      >
        <MarkdownContent text={content} />
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="animate-bubble-in flex gap-3 py-2">
      <div className="w-7 h-7 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0 mt-0.5 animate-pulse-ring">
        <Bot className="w-3.5 h-3.5 text-accent" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-raised border border-border">
        <div className="thinking-dots flex items-center gap-1 h-5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}

function EmptyChat({ agentName }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <MessageSquare className="w-7 h-7 text-accent opacity-60" />
      </div>
      <h3 className="font-medium mb-1">
        Chat with {agentName ?? "Agent"}
      </h3>
      <p className="text-xs text-text-muted leading-relaxed">
        Send a message below. Watch the agent's thought process unfold in the
        right panel — every tool call and result in real time.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Markdown rendering (lightweight)                          */
/* ═══════════════════════════════════════════════════════════ */

function MarkdownContent({ text }) {
  const rendered = useMemo(() => parseMarkdown(text), [text]);
  return <div className="markdown-content">{rendered}</div>;
}

/**
 * Minimal markdown parser — handles the common patterns Claude uses:
 * **bold**, *italic*, `inline code`, ```code blocks```, and line breaks.
 */
function parseMarkdown(text) {
  if (!text) return null;

  const blocks = text.split(/```(\w*)\n?([\s\S]*?)```/g);
  const result = [];

  for (let i = 0; i < blocks.length; i++) {
    if (i % 3 === 0) {
      // Normal text block
      if (blocks[i]) {
        result.push(
          <span key={i}>
            {renderInline(blocks[i])}
          </span>,
        );
      }
    } else if (i % 3 === 2) {
      // Code block content (i%3===1 is the language tag, i%3===2 is the code)
      result.push(
        <pre
          key={i}
          className="my-2 px-3 py-2.5 bg-surface border border-border rounded-lg text-xs font-mono overflow-x-auto"
        >
          {blocks[i]}
        </pre>,
      );
    }
    // i % 3 === 1 is the language tag — skip
  }

  return result;
}

function renderInline(text) {
  // Split on inline patterns, preserving the delimiters
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\n)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 bg-surface-overlay rounded text-[0.85em] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part === "\n") {
      return <br key={i} />;
    }
    return part;
  });
}

/* ═══════════════════════════════════════════════════════════ */
/*  Thought Process: Turn Card                                */
/* ═══════════════════════════════════════════════════════════ */

function TurnCard({ turn, index }) {
  const isDone = turn.status === "done";
  const isError = turn.status === "error";

  return (
    <div className="animate-slide-in space-y-2.5">
      {/* Turn header */}
      <div className="flex items-center gap-2">
        <div
          className={[
            "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono",
            isDone
              ? "bg-success/15 text-success"
              : isError
                ? "bg-danger/15 text-danger"
                : "bg-accent/15 text-accent",
          ].join(" ")}
        >
          {index + 1}
        </div>
        <span className="text-xs text-text-secondary truncate flex-1">
          {turn.userMessage.length > 50
            ? turn.userMessage.slice(0, 50) + "..."
            : turn.userMessage}
        </span>
        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />}
        {isError && <AlertCircle className="w-3.5 h-3.5 text-danger shrink-0" />}
      </div>

      {/* Iterations */}
      {turn.iterations.map((iter, i) => (
        <IterationBlock key={i} iteration={iter} />
      ))}

      {/* Processing indicator */}
      {turn.status === "processing" &&
        turn.iterations.length > 0 &&
        turn.iterations[turn.iterations.length - 1]?.status === "done" && (
          <div className="flex items-center gap-2 pl-7 text-[11px] text-text-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Reasoning...
          </div>
        )}

      {/* Error */}
      {isError && turn.error && (
        <div className="ml-7 px-3 py-2 rounded-lg bg-danger/5 border border-danger/20 text-xs text-danger">
          {turn.error}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Thought Process: Iteration Block                          */
/* ═══════════════════════════════════════════════════════════ */

function IterationBlock({ iteration }) {
  return (
    <div className="space-y-1.5">
      {/* Iteration label */}
      <div className="flex items-center gap-2 pl-1">
        <Hash className="w-3 h-3 text-text-muted" />
        <span className="text-[11px] text-text-muted font-mono">
          Iteration {iteration.number}
        </span>
        {iteration.status === "thinking" && (
          <div className="thinking-dots flex items-center gap-0.5 ml-1">
            <span className="w-1 h-1 rounded-full bg-accent" />
            <span className="w-1 h-1 rounded-full bg-accent" />
            <span className="w-1 h-1 rounded-full bg-accent" />
          </div>
        )}
      </div>

      {/* Tool calls */}
      {iteration.toolCalls.map((tc, i) => (
        <ToolCallCard key={tc.id ?? i} toolCall={tc} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Thought Process: Tool Call Card (expandable)              */
/* ═══════════════════════════════════════════════════════════ */

function ToolCallCard({ toolCall }) {
  const [expanded, setExpanded] = useState(true);
  const isDone = toolCall.status === "done";

  return (
    <div
      className={[
        "animate-slide-in ml-4 rounded-lg border overflow-hidden transition-colors",
        isDone
          ? "bg-surface-raised border-border"
          : "bg-accent/[0.03] border-accent/20",
      ].join(" ")}
    >
      {/* Card header — always visible */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-overlay/50 transition-colors"
      >
        {/* Status icon */}
        {isDone ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
        ) : (
          <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          </div>
        )}

        {/* Skill name */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Wrench className="w-3 h-3 text-text-muted shrink-0" />
          <span className="text-xs font-mono font-medium truncate">
            {toolCall.name}
          </span>
        </div>

        {/* Expand chevron */}
        <div className="ml-auto shrink-0">
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-text-muted" />
          ) : (
            <ChevronRight className="w-3 h-3 text-text-muted" />
          )}
        </div>
      </button>

      {/* Expandable body */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/50">
          {/* Input params */}
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
              Input
            </div>
            <pre className="text-[11px] font-mono bg-surface rounded-md p-2.5 overflow-x-auto text-text-secondary">
              <ParamHighlight data={toolCall.input} />
            </pre>
          </div>

          {/* Output / result */}
          {isDone && toolCall.output !== null ? (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-success mb-1">
                Result
              </div>
              <pre className="text-[11px] font-mono bg-surface rounded-md p-2.5 overflow-x-auto text-text-primary whitespace-pre-wrap">
                {toolCall.output}
              </pre>
            </div>
          ) : !isDone ? (
            <div className="flex items-center gap-2 py-1 text-[11px] text-text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Executing...
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Param highlight (mini inline JSON syntax coloring)        */
/* ═══════════════════════════════════════════════════════════ */

function ParamHighlight({ data }) {
  const json = JSON.stringify(data, null, 2);
  const parts = [];
  let idx = 0;

  for (const line of json.split("\n")) {
    if (idx > 0) parts.push(<br key={`br-${idx}`} />);

    const re =
      /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(true|false|null)|(-?\d+(?:\.\d+)?)|([{}[\]:,])|(\s+)/g;
    let m;
    let last = 0;

    while ((m = re.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));

      if (m[1] !== undefined) {
        parts.push(
          <span key={`k${idx}-${m.index}`} className="text-accent">
            {m[1]}
          </span>,
        );
        parts.push(": ");
      } else if (m[2] !== undefined) {
        parts.push(
          <span key={`s${idx}-${m.index}`} className="text-success">
            {m[2]}
          </span>,
        );
      } else if (m[3] !== undefined || m[4] !== undefined) {
        parts.push(
          <span key={`v${idx}-${m.index}`} className="text-warning">
            {m[3] ?? m[4]}
          </span>,
        );
      } else if (m[5] !== undefined) {
        parts.push(
          <span key={`p${idx}-${m.index}`} className="text-text-muted">
            {m[5]}
          </span>,
        );
      } else {
        parts.push(m[6]);
      }

      last = m.index + m[0].length;
    }

    if (last < line.length) parts.push(line.slice(last));
    idx++;
  }

  return <>{parts}</>;
}
