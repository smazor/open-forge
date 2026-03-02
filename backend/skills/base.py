"""Abstract base class for all SkillForge skills.

A Skill is a self-describing, executable unit of functionality that an AI agent
can invoke.  Each skill declares its own name, description, and parameter schema
so the agent framework can present it to the LLM as a tool and validate inputs
before execution.

Subclasses must implement:
    - ``name``        – unique identifier used in tool-use calls
    - ``description`` – natural-language summary shown to the LLM
    - ``parameters``  – JSON Schema dict describing accepted keyword arguments
    - ``execute``     – the async method that actually performs the work
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class Skill(ABC):
    """Base class every skill must inherit from.

    A skill wraps a single capability (math, web fetch, file I/O, …) behind a
    uniform interface so the orchestration layer can:

    1. **Discover** it via ``name`` / ``description``.
    2. **Describe** it to the LLM via ``to_tool_definition()``.
    3. **Execute** it with validated kwargs via ``execute()``.

    Example
    -------
    >>> class EchoSkill(Skill):
    ...     name = "echo"
    ...     description = "Echoes back the input text."
    ...     parameters = {
    ...         "type": "object",
    ...         "properties": {"text": {"type": "string"}},
    ...         "required": ["text"],
    ...     }
    ...     async def execute(self, **kwargs) -> str:
    ...         return kwargs["text"]
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique machine-readable identifier for this skill.

        This value is sent as the ``name`` field in the Anthropic tool-use API
        and is used by the registry for look-ups.  Keep it short, lowercase,
        and use underscores (e.g. ``"calculator"``, ``"web_fetcher"``).
        """

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-/LLM-readable summary of what this skill does.

        The orchestration layer passes this string to the model so it can
        decide *when* to invoke the tool.  Be concise but specific — mention
        the kind of input the skill expects and the shape of its output.
        """

    @property
    @abstractmethod
    def parameters(self) -> dict[str, Any]:
        """JSON Schema describing the keyword arguments ``execute`` accepts.

        Must be a valid JSON Schema *object* definition, e.g.::

            {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "A math expression to evaluate."
                    }
                },
                "required": ["expression"]
            }

        The schema is included verbatim in the Anthropic tool definition and is
        also available for server-side validation before calling ``execute``.
        """

    @abstractmethod
    async def execute(self, **kwargs: Any) -> str:
        """Run the skill with the supplied arguments and return a text result.

        Parameters
        ----------
        **kwargs
            Keyword arguments matching the ``parameters`` JSON Schema.

        Returns
        -------
        str
            A plain-text result that will be sent back to the LLM as the
            tool-use response content.

        Raises
        ------
        Exception
            Implementations should raise descriptive exceptions on failure;
            the orchestration layer will catch them and relay the error
            message to the model.
        """

    def to_tool_definition(self) -> dict[str, Any]:
        """Serialise this skill into the Anthropic tool-use format.

        Returns a dict ready to be included in the ``tools`` list of an
        Anthropic ``messages.create`` call::

            {
                "name": "calculator",
                "description": "Evaluates a math expression.",
                "input_schema": { ... JSON Schema ... }
            }
        """
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.parameters,
        }
