"""Router for the WebSocket chat endpoint."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import database as db
from agent.engine import AgentEngine
from agent.memory import ConversationMemory
from skills import SkillRegistry

router = APIRouter(tags=["chat"])

# Injected at startup from main.py.
_registry: SkillRegistry | None = None

# In-memory conversation buffers keyed by (agent_id, connection).
# A production app would persist these; here we keep it simple.


def set_registry(registry: SkillRegistry) -> None:
    global _registry
    _registry = registry


@router.websocket("/api/chat/{agent_id}")
async def chat(websocket: WebSocket, agent_id: int) -> None:
    """Stream agent events over a WebSocket connection.

    Client sends JSON: ``{"message": "..."}``
    Server streams JSON events back: ``{"type": "...", "data": {...}}``
    """
    agent_config = await db.get_agent(agent_id)
    if agent_config is None:
        await websocket.close(code=4004, reason="Agent not found")
        return

    await websocket.accept()

    # Build a registry scoped to this agent's skills.
    scoped_registry = SkillRegistry()
    for skill in _registry.list_skills():
        if skill.name in agent_config.skill_names:
            scoped_registry.register(skill)

    engine = AgentEngine(
        scoped_registry,
        system_prompt=agent_config.system_prompt,
    )
    memory = ConversationMemory()

    try:
        while True:
            # Wait for a message from the client.
            raw = await websocket.receive_text()
            data = json.loads(raw)
            user_message = data.get("message", "")

            if not user_message:
                continue

            # Run the agent loop, streaming every event to the client.
            final_text = ""
            async for event in engine.run(user_message, history=memory.get_history()):
                await websocket.send_text(json.dumps(event, default=str))
                if event["type"] == "message":
                    final_text = event["data"]["text"]

            # Persist the exchange in rolling memory.
            memory.add("user", user_message)
            if final_text:
                memory.add("assistant", final_text)

    except WebSocketDisconnect:
        pass
