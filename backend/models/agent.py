"""Pydantic models for agent configuration."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AgentConfig(BaseModel):
    """Full agent configuration as returned by the API."""

    id: int
    name: str
    system_prompt: str
    skill_names: list[str]
    temperature: float


class AgentCreate(BaseModel):
    """Payload for creating a new agent."""

    name: str = Field(..., min_length=1, max_length=100)
    system_prompt: str = ""
    skill_names: list[str] = []
    temperature: float = Field(default=1.0, ge=0.0, le=2.0)


class AgentUpdate(BaseModel):
    """Payload for updating an agent (all fields optional)."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    system_prompt: str | None = None
    skill_names: list[str] | None = None
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
