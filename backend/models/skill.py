"""Pydantic models for skill metadata exposed via the API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class SkillConfig(BaseModel):
    """Read-only description of a registered skill."""

    name: str
    description: str
    parameters: dict[str, Any]
