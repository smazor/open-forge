"""Router for skill-related endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.skill import SkillConfig
from skills import SkillRegistry

router = APIRouter(prefix="/api/skills", tags=["skills"])

# The registry is injected at startup from main.py via the module-level ref.
_registry: SkillRegistry | None = None


def set_registry(registry: SkillRegistry) -> None:
    global _registry
    _registry = registry


@router.get("", response_model=list[SkillConfig])
async def list_skills() -> list[SkillConfig]:
    """Return every registered skill's metadata."""
    return [
        SkillConfig(
            name=s.name,
            description=s.description,
            parameters=s.parameters,
        )
        for s in _registry.list_skills()
    ]


class SkillTestRequest(BaseModel):
    input: dict[str, Any]


class SkillTestResponse(BaseModel):
    output: str


@router.post("/{skill_name}/test", response_model=SkillTestResponse)
async def test_skill(skill_name: str, body: SkillTestRequest) -> SkillTestResponse:
    """Execute a skill with the given input and return its output."""
    skill = _registry.get(skill_name)
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    try:
        output = await skill.execute(**body.input)
    except Exception as exc:
        output = f"Error: {exc}"
    return SkillTestResponse(output=output)
