"""SkillRegistry — central catalogue for discovering and looking up skills."""

from __future__ import annotations

from typing import Any

from .base import Skill


class SkillRegistry:
    """Maintains a name → Skill mapping and exposes helpers for the agent loop.

    Usage::

        registry = SkillRegistry()
        registry.register(CalculatorSkill())
        registry.register(WebFetcherSkill())

        # Look-up by name (as received from the LLM tool call).
        skill = registry.get("calculator")

        # Build the ``tools`` list for Anthropic's messages API.
        tools = registry.tool_definitions()
    """

    def __init__(self) -> None:
        self._skills: dict[str, Skill] = {}

    def register(self, skill: Skill) -> None:
        """Add a skill to the registry.

        Raises ``ValueError`` if a skill with the same name is already
        registered.
        """
        if skill.name in self._skills:
            raise ValueError(f"Skill '{skill.name}' is already registered.")
        self._skills[skill.name] = skill

    def get(self, name: str) -> Skill | None:
        """Return the skill with the given name, or ``None``."""
        return self._skills.get(name)

    def list_skills(self) -> list[Skill]:
        """Return all registered skills in insertion order."""
        return list(self._skills.values())

    def tool_definitions(self) -> list[dict[str, Any]]:
        """Return Anthropic-formatted tool definitions for every skill."""
        return [s.to_tool_definition() for s in self._skills.values()]
