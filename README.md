# SkillForge

**An AI Agent Builder** — a hands-on tutorial app that teaches you how to build AI agents with tool use from scratch using the Claude API.

Build agents that *reason*, *act*, and *observe* — then watch every step of their thought process in real time.

---

## What You'll See

**Dashboard** — Mission control overview showing all configured agents and available skills, with live stats and quick-launch cards.

**Skills page** — Browse every tool the system offers. Click a skill to inspect its parameter schema, see the exact Anthropic tool definition Claude receives, and test it live with custom input.

**Agent Studio** — Configure agents with a name, system prompt, skill set (via checkboxes with descriptions), and temperature slider. A live JSON preview shows the complete config as you edit. Save sends you straight to chat.

**Chat Arena** — The hero page. A split-screen interface:
- *Left (70%):* Chat with markdown rendering, animated message bubbles, and a thinking indicator.
- *Right (30%):* "Agent Thought Process" debugger panel showing every ReAct loop iteration, tool call (with syntax-highlighted input), and result — cards slide in live as the agent works.

---

## What This Teaches

| Concept | Where it's implemented |
|---|---|
| **Anthropic tool-use format** | `skills/base.py` → `to_tool_definition()` |
| **ReAct agent loop** | `agent/engine.py` — Reason → Act → Observe cycle |
| **Async generators for streaming** | `engine.run()` yields events as they happen |
| **WebSocket real-time communication** | `routers/chat.py` ↔ `hooks/useChat.js` |
| **Safe code execution** | `skills/code_runner.py` — subprocess with 5s timeout |
| **Input validation via JSON Schema** | Each skill declares `parameters` as JSON Schema |
| **Abstract base classes in Python** | `skills/base.py` — all skills inherit from `Skill` |
| **SQLite with async Python** | `database.py` using aiosqlite |
| **React state machines** | `useChat` hook tracks turns → iterations → tool calls |
| **Tailwind CSS design systems** | `@theme` tokens in `index.css` |

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- An Anthropic API key (optional — the app shows a friendly message without one)

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Optional: enable AI responses
export ANTHROPIC_API_KEY="sk-ant-..."

uvicorn main:app --reload --port 8000
```

The database is auto-created on first startup with a seeded "General Assistant" agent.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│  React 19 + Vite 7 + Tailwind CSS 4 + React Router 7       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │Dashboard │  │ Skills   │  │ Agents   │  │ Chat Arena │  │
│  │  /       │  │ /skills  │  │ /agents  │  │/chat/:id   │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────┬──────┘  │
│                                                   │         │
│                     REST (fetch)          WebSocket│         │
└─────────────────────────────────┬─────────────────┼─────────┘
                                  │                 │
┌─────────────────────────────────┼─────────────────┼─────────┐
│                        Backend  │                 │         │
│  FastAPI + uvicorn              │                 │         │
│                                 ▼                 ▼         │
│  ┌──────────────────┐  ┌──────────────────────────────┐     │
│  │   REST Routers   │  │     WebSocket Chat Router    │     │
│  │  /api/skills     │  │  /api/chat/{agent_id}        │     │
│  │  /api/agents     │  │                              │     │
│  └────────┬─────────┘  └──────────────┬───────────────┘     │
│           │                           │                     │
│           ▼                           ▼                     │
│  ┌─────────────────┐       ┌────────────────────┐          │
│  │    Database      │       │   Agent Engine     │          │
│  │  (aiosqlite)     │       │   (ReAct loop)     │          │
│  └─────────────────┘       └─────────┬──────────┘          │
│                                      │                      │
│                            ┌─────────▼──────────┐          │
│                            │   Skill Registry   │          │
│                            │                    │          │
│                            │  ┌──────────────┐  │          │
│                            │  │  calculator  │  │          │
│                            │  │  web_fetcher │  │          │
│                            │  │  file_reader │  │          │
│                            │  │  code_runner │  │          │
│                            │  └──────────────┘  │          │
│                            └────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## How the Skill System Works

Every skill is a Python class that inherits from `Skill` and declares four things:

```python
class CalculatorSkill(Skill):
    name = "calculator"                    # Unique ID
    description = "Evaluate math..."       # What Claude sees
    parameters = { "type": "object", ... } # JSON Schema for inputs

    async def execute(self, **kwargs) -> str:
        # Do the work, return a string
```

The `to_tool_definition()` method serializes this into Anthropic's tool format:

```json
{
  "name": "calculator",
  "description": "Evaluate a mathematical expression...",
  "input_schema": { "type": "object", "properties": { ... } }
}
```

The `SkillRegistry` collects all skills and provides `tool_definitions()` for the API call plus `get(name)` for execution.

---

## How the Agent Loop Works

`AgentEngine.run()` is an async generator implementing the ReAct pattern:

```
User: "Calculate 15% tip on $84.50"
                │
                ▼
┌─ Iteration 1 ────────────────────────────┐
│  REASON: Send to Claude with tools       │
│  Claude returns: tool_use(calculator,    │
│    {"expression": "84.50 * 0.15"})       │
│                                          │
│  ACT: Execute calculator skill           │
│  Result: "12.675"                        │
│                                          │
│  OBSERVE: Feed result back to Claude     │
└──────────────────────────────────────────┘
                │
                ▼
┌─ Iteration 2 ────────────────────────────┐
│  REASON: Claude sees the tool result     │
│  Claude returns: text response           │
│  "The 15% tip on $84.50 is $12.68..."   │
└──────────────────────────────────────────┘
```

Each step yields a structured event (`thinking`, `tool_call`, `tool_result`, `message`) that streams over WebSocket to the frontend's thought-process panel.

---

## Project Structure

```
skillforge/
├── backend/
│   ├── main.py                 # FastAPI app, lifespan, router mounting
│   ├── database.py             # SQLite via aiosqlite, agent CRUD
│   ├── requirements.txt
│   ├── skills/
│   │   ├── base.py             # Abstract Skill class
│   │   ├── calculator.py       # Safe math via AST
│   │   ├── web_fetcher.py      # URL fetch → plain text
│   │   ├── file_reader.py      # Sandboxed /tmp/skillforge-sandbox/
│   │   ├── code_runner.py      # Python subprocess, 5s timeout
│   │   └── registry.py         # SkillRegistry
│   ├── agent/
│   │   ├── engine.py           # AgentEngine — the ReAct loop
│   │   └── memory.py           # ConversationMemory (last 20 msgs)
│   ├── models/
│   │   ├── skill.py            # SkillConfig pydantic model
│   │   └── agent.py            # AgentConfig, AgentCreate, AgentUpdate
│   ├── routers/
│   │   ├── skills.py           # GET /api/skills, POST /api/skills/:name/test
│   │   ├── agents.py           # CRUD /api/agents
│   │   └── chat.py             # WebSocket /api/chat/:agent_id
│   ├── test_skills.py          # Skill smoke test
│   ├── test_agent.py           # Agent engine test (needs API key)
│   └── test_integration.py     # Full end-to-end test
├── frontend/
│   ├── index.html              # Google Fonts (DM Sans, JetBrains Mono)
│   ├── vite.config.js          # Vite + React + Tailwind plugins
│   └── src/
│       ├── index.css           # Theme tokens, animations, grid pattern
│       ├── App.jsx             # Router: /, /skills, /agents, /chat/:id
│       ├── api/client.js       # REST client for backend
│       ├── hooks/useChat.js    # WebSocket hook with structured turn tracking
│       ├── components/
│       │   ├── Layout.jsx      # Sidebar + Outlet
│       │   └── JsonBlock.jsx   # Syntax-highlighted JSON with copy button
│       └── pages/
│           ├── Dashboard.jsx   # Stats cards, agent grid, skill grid
│           ├── Skills.jsx      # Skill browser + test panel
│           ├── Agents.jsx      # Agent CRUD + live JSON preview
│           └── Chat.jsx        # Split chat + thought process panel
└── README.md
```

---

## Running Tests

```bash
# Skill system (no API key needed)
cd backend && source .venv/bin/activate
python test_skills.py

# Full integration (start both servers first, no API key needed)
python test_integration.py

# Agent engine (requires ANTHROPIC_API_KEY)
export ANTHROPIC_API_KEY="sk-ant-..."
python test_agent.py
```

---

## Exercises for the Reader

These are ordered roughly by difficulty. Each one teaches a different aspect of agent systems.

### Beginner

1. **Add a new skill** — Create a `datetime_skill.py` that returns the current date/time in any timezone. Register it in `main.py` and test it from the Skills page.

2. **Persistent chat history** — Right now conversations reset when you reload. Store chat messages in SQLite and load them when reopening a chat.

3. **Agent avatars** — Add an `avatar` field (emoji or color) to `AgentConfig`. Display it in the sidebar and chat bubbles instead of the default icon.

### Intermediate

4. **Streaming responses** — Instead of waiting for the full Claude response, use `client.messages.stream()` to stream tokens as they arrive. Yield a new `"token"` event type and render it character-by-character in the chat.

5. **Skill composition** — Create a `PipelineSkill` that chains multiple skills together (e.g., fetch a URL, then summarize it with code_runner). Think about how to represent multi-step skills in the registry.

6. **Error recovery** — When a tool call fails, the agent currently just passes the error string back to Claude. Add retry logic with exponential backoff, and show retry attempts in the thought process panel.

### Advanced

7. **Multi-agent orchestration** — Create a "supervisor" agent that delegates sub-tasks to other agents. The supervisor decides which specialist to call based on the question. Show the full delegation chain in the UI.

8. **Custom skill builder UI** — Let users define new skills from the frontend: name, description, parameter schema, and a Python code body. Store them in the database and dynamically load them into the registry.

9. **Evaluation harness** — Build a test suite that sends predefined questions to agents and scores their responses. Display pass/fail rates on the dashboard. This is how production agent systems are evaluated.

---

Generated on 2026-28-01 — @smazor project