import { useState, useRef, useCallback, useEffect } from "react";

const WS_BASE = "ws://localhost:8000";

/**
 * Hook for managing a WebSocket chat connection to an agent.
 *
 * Returns:
 *  - messages       — {role, content} pairs for the chat
 *  - turns          — array of turn objects, each containing the structured
 *                     events for that round (thinking, tool calls, result, etc.)
 *  - isProcessing   — true while the agent is working on a response
 *  - sendMessage    — send a user message
 *  - isConnected    — WebSocket connection status
 *  - error          — last error string
 *  - clearMessages  — reset all state
 */
export default function useChat(agentId) {
  const [messages, setMessages] = useState([]);
  const [turns, setTurns] = useState([]);         // array of Turn objects
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!agentId) return;

    const ws = new WebSocket(`${WS_BASE}/api/chat/${agentId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (e) => {
      const event = JSON.parse(e.data);

      switch (event.type) {
        case "thinking":
          // Start a new iteration step in the current turn.
          setTurns((prev) => {
            const updated = [...prev];
            const turn = updated[updated.length - 1];
            if (turn) {
              turn.iterations.push({
                number: event.data.iteration,
                toolCalls: [],
                status: "thinking",
              });
            }
            return updated;
          });
          break;

        case "tool_call":
          // Add a pending tool call to the current iteration.
          setTurns((prev) => {
            const updated = [...prev];
            const turn = updated[updated.length - 1];
            if (turn) {
              const iter = turn.iterations[turn.iterations.length - 1];
              if (iter) {
                iter.status = "calling";
                iter.toolCalls.push({
                  id: event.data.tool_use_id,
                  name: event.data.name,
                  input: event.data.input,
                  output: null,
                  status: "running",
                });
              }
            }
            return updated;
          });
          break;

        case "tool_result":
          // Fill in the result on the matching tool call.
          setTurns((prev) => {
            const updated = [...prev];
            const turn = updated[updated.length - 1];
            if (turn) {
              const iter = turn.iterations[turn.iterations.length - 1];
              if (iter) {
                // Find by name (most recent running one).
                const tc = [...iter.toolCalls]
                  .reverse()
                  .find(
                    (t) =>
                      t.name === event.data.name && t.status === "running",
                  );
                if (tc) {
                  tc.output = event.data.output;
                  tc.status = "done";
                }
                // Mark iteration done if all tool calls finished.
                if (iter.toolCalls.every((t) => t.status === "done")) {
                  iter.status = "done";
                }
              }
            }
            return updated;
          });
          break;

        case "message":
          // Final assistant response.
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: event.data.text },
          ]);
          setTurns((prev) => {
            const updated = [...prev];
            const turn = updated[updated.length - 1];
            if (turn) turn.status = "done";
            return updated;
          });
          setIsProcessing(false);
          break;

        case "error":
          setTurns((prev) => {
            const updated = [...prev];
            const turn = updated[updated.length - 1];
            if (turn) {
              turn.status = "error";
              turn.error = event.data.text;
            }
            return updated;
          });
          setIsProcessing(false);
          break;
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection error");
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };
  }, [agentId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);

    // Create a new turn to track the agent's thought process.
    setTurns((prev) => [
      ...prev,
      {
        userMessage: text,
        iterations: [],
        status: "processing",
        error: null,
      },
    ]);
    setIsProcessing(true);

    wsRef.current.send(JSON.stringify({ message: text }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTurns([]);
    setIsProcessing(false);
  }, []);

  return {
    messages,
    turns,
    isProcessing,
    sendMessage,
    isConnected,
    error,
    clearMessages,
  };
}
