"""SQLite database layer using aiosqlite.

Stores agent configurations.  The database file lives at ``./skillforge.db``
(relative to the backend working directory).
"""

from __future__ import annotations

import json
from pathlib import Path

import aiosqlite

from models.agent import AgentConfig

DB_PATH = Path(__file__).parent / "skillforge.db"

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

_SCHEMA = """
CREATE TABLE IF NOT EXISTS agents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    system_prompt TEXT    NOT NULL DEFAULT '',
    skill_names   TEXT    NOT NULL DEFAULT '[]',   -- JSON array of strings
    temperature   REAL    NOT NULL DEFAULT 1.0
);
"""

_SEED_AGENT = {
    "name": "General Assistant",
    "system_prompt": (
        "You are a helpful general-purpose assistant. "
        "Use the provided tools whenever they can help answer the user's question."
    ),
    "skill_names": ["calculator", "web_fetcher", "file_reader", "code_runner"],
    "temperature": 1.0,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _row_to_config(row: aiosqlite.Row) -> AgentConfig:
    """Convert a database row to an AgentConfig."""
    return AgentConfig(
        id=row["id"],
        name=row["name"],
        system_prompt=row["system_prompt"],
        skill_names=json.loads(row["skill_names"]),
        temperature=row["temperature"],
    )


def _connect() -> aiosqlite.Connection:
    """Return an aiosqlite connection context manager with row_factory set.

    Use as ``async with _connect() as conn: ...``
    (do NOT await — aiosqlite.connect() is itself an async context manager).
    """
    conn = aiosqlite.connect(DB_PATH)
    return conn


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


async def init_db() -> None:
    """Create tables and seed the demo agent if the DB is empty."""
    async with _connect() as conn:
        conn.row_factory = aiosqlite.Row
        await conn.executescript(_SCHEMA)
        cursor = await conn.execute("SELECT COUNT(*) FROM agents")
        count = (await cursor.fetchone())[0]
        if count == 0:
            await conn.execute(
                "INSERT INTO agents (name, system_prompt, skill_names, temperature) VALUES (?, ?, ?, ?)",
                (
                    _SEED_AGENT["name"],
                    _SEED_AGENT["system_prompt"],
                    json.dumps(_SEED_AGENT["skill_names"]),
                    _SEED_AGENT["temperature"],
                ),
            )
            await conn.commit()


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


async def list_agents() -> list[AgentConfig]:
    async with _connect() as conn:
        conn.row_factory = aiosqlite.Row
        cursor = await conn.execute("SELECT * FROM agents ORDER BY id")
        return [_row_to_config(row) for row in await cursor.fetchall()]


async def get_agent(agent_id: int) -> AgentConfig | None:
    async with _connect() as conn:
        conn.row_factory = aiosqlite.Row
        cursor = await conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
        row = await cursor.fetchone()
        return _row_to_config(row) if row else None


async def create_agent(
    name: str,
    system_prompt: str,
    skill_names: list[str],
    temperature: float,
) -> AgentConfig:
    async with _connect() as conn:
        conn.row_factory = aiosqlite.Row
        cursor = await conn.execute(
            "INSERT INTO agents (name, system_prompt, skill_names, temperature) VALUES (?, ?, ?, ?)",
            (name, system_prompt, json.dumps(skill_names), temperature),
        )
        await conn.commit()
        return AgentConfig(
            id=cursor.lastrowid,
            name=name,
            system_prompt=system_prompt,
            skill_names=skill_names,
            temperature=temperature,
        )


async def update_agent(
    agent_id: int,
    *,
    name: str | None = None,
    system_prompt: str | None = None,
    skill_names: list[str] | None = None,
    temperature: float | None = None,
) -> AgentConfig | None:
    existing = await get_agent(agent_id)
    if existing is None:
        return None

    new_name = name if name is not None else existing.name
    new_prompt = system_prompt if system_prompt is not None else existing.system_prompt
    new_skills = skill_names if skill_names is not None else existing.skill_names
    new_temp = temperature if temperature is not None else existing.temperature

    async with _connect() as conn:
        conn.row_factory = aiosqlite.Row
        await conn.execute(
            "UPDATE agents SET name=?, system_prompt=?, skill_names=?, temperature=? WHERE id=?",
            (new_name, new_prompt, json.dumps(new_skills), new_temp, agent_id),
        )
        await conn.commit()

    return AgentConfig(
        id=agent_id,
        name=new_name,
        system_prompt=new_prompt,
        skill_names=new_skills,
        temperature=new_temp,
    )


async def delete_agent(agent_id: int) -> bool:
    async with _connect() as conn:
        conn.row_factory = aiosqlite.Row
        cursor = await conn.execute("DELETE FROM agents WHERE id = ?", (agent_id,))
        await conn.commit()
        return cursor.rowcount > 0
