"""Full integration test — verifies every layer end-to-end.

Tests:
  1. Health check
  2. Skills API (list + test)
  3. Agents API (list seeded, create, get, patch, delete)
  4. WebSocket chat (connect, send message, receive events)
  5. Frontend dev server is reachable
"""

import asyncio
import json
import sys

import httpx
import websockets

BASE = "http://localhost:8000"
WS_BASE = "ws://localhost:8000"
FRONTEND = "http://localhost:5173"

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"

results = []


def check(name, ok, detail=""):
    sym = PASS if ok else FAIL
    results.append(ok)
    extra = f"  ({detail})" if detail else ""
    print(f"  {sym} {name}{extra}")


async def main():
    async with httpx.AsyncClient(base_url=BASE, timeout=10) as c:
        print("\n1. Health & Servers")
        r = await c.get("/health")
        check("Backend /health", r.status_code == 200, r.json().get("app"))

        r2 = await httpx.AsyncClient().get(FRONTEND, timeout=5)
        check("Frontend reachable", r2.status_code == 200)

        # ── Skills ──────────────────────────────────────
        print("\n2. Skills API")
        r = await c.get("/api/skills")
        skills = r.json()
        check("GET /api/skills", r.status_code == 200, f"{len(skills)} skills")
        skill_names = [s["name"] for s in skills]
        check("Has calculator", "calculator" in skill_names)
        check("Has web_fetcher", "web_fetcher" in skill_names)
        check("Has file_reader", "file_reader" in skill_names)
        check("Has code_runner", "code_runner" in skill_names)

        # Test skill execution
        r = await c.post(
            "/api/skills/calculator/test",
            json={"input": {"expression": "84.50 * 0.15"}},
        )
        check("POST calculator/test", r.status_code == 200, f'output={r.json()["output"]}')

        r = await c.post(
            "/api/skills/code_runner/test",
            json={"input": {"code": "print('hello from code_runner')"}},
        )
        check("POST code_runner/test", r.status_code == 200, f'output={r.json()["output"]}')

        # ── Agents ──────────────────────────────────────
        print("\n3. Agents API")
        r = await c.get("/api/agents")
        agents = r.json()
        check("GET /api/agents (seeded)", r.status_code == 200, f"{len(agents)} agents")
        check("General Assistant exists", agents[0]["name"] == "General Assistant")
        check(
            "General Assistant has 4 skills",
            len(agents[0]["skill_names"]) == 4,
            str(agents[0]["skill_names"]),
        )

        # Create
        r = await c.post(
            "/api/agents",
            json={
                "name": "Test Bot",
                "system_prompt": "Test prompt",
                "skill_names": ["calculator"],
                "temperature": 0.5,
            },
        )
        check("POST /api/agents (create)", r.status_code == 201, f'id={r.json()["id"]}')
        new_id = r.json()["id"]

        # Get
        r = await c.get(f"/api/agents/{new_id}")
        check("GET /api/agents/:id", r.status_code == 200, r.json()["name"])

        # Patch
        r = await c.patch(f"/api/agents/{new_id}", json={"name": "Updated Bot"})
        check("PATCH /api/agents/:id", r.status_code == 200, r.json()["name"])

        # Delete
        r = await c.delete(f"/api/agents/{new_id}")
        check("DELETE /api/agents/:id", r.status_code == 204)

        # Verify gone
        r = await c.get(f"/api/agents/{new_id}")
        check("Deleted agent returns 404", r.status_code == 404)

        # ── WebSocket Chat ──────────────────────────────
        print("\n4. WebSocket Chat (/api/chat/1)")
        events_received = []
        try:
            async with websockets.connect(f"{WS_BASE}/api/chat/1") as ws:
                check("WebSocket connected", True)

                await ws.send(json.dumps({
                    "message": "Calculate 15% tip on a $84.50 dinner bill, then write Python code that prints a formatted receipt"
                }))
                check("Sent chat message", True)

                while True:
                    raw = await asyncio.wait_for(ws.recv(), timeout=30)
                    event = json.loads(raw)
                    events_received.append(event)
                    if event["type"] in ("message", "error"):
                        break

            event_types = [e["type"] for e in events_received]
            check("Received 'thinking' event", "thinking" in event_types)
            check(
                "Received 'message' event",
                "message" in event_types,
                events_received[-1].get("data", {}).get("text", "")[:80] + "...",
            )
            print(f"\n    Event stream: {' → '.join(event_types)}")

        except Exception as exc:
            check("WebSocket chat", False, str(exc))

        # ── Dashboard data check ────────────────────────
        print("\n5. Dashboard Data")
        r = await c.get("/api/skills")
        r2 = await c.get("/api/agents")
        check("Skills available for dashboard", len(r.json()) == 4)
        check("Agents available for dashboard", len(r2.json()) >= 1)

    # ── Summary ─────────────────────────────────────────
    total = len(results)
    passed = sum(results)
    failed = total - passed
    print(f"\n{'='*50}")
    if failed == 0:
        print(f"  {PASS} All {total} checks passed!")
    else:
        print(f"  {FAIL} {passed}/{total} passed, {failed} failed")
    print(f"{'='*50}\n")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
