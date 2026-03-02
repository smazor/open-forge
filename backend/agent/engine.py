"""AgentEngine — the core ReAct loop that connects Claude to skills.

The engine implements a Reasoning + Acting (ReAct) loop:

    1. REASON  — Send the conversation (including any prior tool results) to
                 Claude and let it decide what to do next.
    2. ACT     — If Claude returns ``tool_use`` blocks, execute the
                 corresponding skills via the SkillRegistry.
    3. OBSERVE — Feed the tool results back into the conversation and go to 1.
    4. RESPOND — When Claude returns a plain text response (no tool calls),
                 the loop terminates and the final message is yielded.

The loop is capped at ``max_iterations`` (default 10) to prevent runaway
chains.  Every significant step is yielded as a structured event so callers
(API routes, CLI scripts, WebSocket handlers) can stream progress to the UI.

Event types
-----------
- ``thinking``    — Claude is about to be called (includes iteration number).
- ``tool_call``   — Claude chose to invoke a tool (includes name + input).
- ``tool_result`` — A skill finished executing (includes name + output).
- ``message``     — Final text response from Claude (loop is done).
- ``error``       — Something went wrong (includes error string).
"""

from __future__ import annotations

import json
import os
from typing import Any, AsyncGenerator

import anthropic

from skills.registry import SkillRegistry

# Default model — fast, capable, and cheap for tool-use loops.
_DEFAULT_MODEL = "claude-sonnet-4-20250514"

# Hard ceiling on ReAct iterations to avoid infinite loops.
_MAX_ITERATIONS = 10


class AgentEngine:
    """Drives the ReAct loop between Claude and a set of skills.

    Parameters
    ----------
    registry : SkillRegistry
        The set of skills available to the agent.
    model : str, optional
        Anthropic model ID.  Defaults to Claude Sonnet.
    system_prompt : str, optional
        System-level instructions prepended to every request.
    max_iterations : int, optional
        Maximum number of reason → act → observe cycles (default 10).
    """

    def __init__(
        self,
        registry: SkillRegistry,
        *,
        model: str = _DEFAULT_MODEL,
        system_prompt: str = "",
        max_iterations: int = _MAX_ITERATIONS,
    ) -> None:
        self.registry = registry
        self.model = model
        self.system_prompt = system_prompt
        self.max_iterations = max_iterations
        # Initialise the Anthropic async client.
        # Reads ANTHROPIC_API_KEY from the environment automatically.
        self._has_api_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
        self._client = anthropic.AsyncAnthropic() if self._has_api_key else None

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def run(
        self,
        user_message: str,
        history: list[dict[str, Any]] | None = None,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Execute the ReAct loop and yield events as they occur.

        Parameters
        ----------
        user_message : str
            The latest message from the user.
        history : list[dict], optional
            Prior conversation turns in Anthropic message format
            (``[{"role": "user"|"assistant", "content": ...}, ...]``).

        Yields
        ------
        dict
            Structured events — see module docstring for the schema.
        """

        # ---------------------------------------------------------------
        # Guard: no API key configured.
        # ---------------------------------------------------------------
        if not self._has_api_key:
            yield {"type": "thinking", "data": {"iteration": 1}}
            yield {
                "type": "message",
                "data": {"text": "No API key configured. Set the `ANTHROPIC_API_KEY` environment variable and restart the server to enable agent responses."},
            }
            return

        # ---------------------------------------------------------------
        # Build the initial messages list.
        #
        # We start from any prior history, then append the new user turn.
        # As the loop progresses, we'll keep appending assistant and tool-
        # result turns so Claude has full context for each call.
        # ---------------------------------------------------------------
        messages: list[dict[str, Any]] = list(history or [])
        messages.append({"role": "user", "content": user_message})

        # Collect the Anthropic-formatted tool definitions from the registry.
        tools = self.registry.tool_definitions()

        for iteration in range(1, self.max_iterations + 1):
            # -----------------------------------------------------------
            # STEP 1 — REASON
            #
            # Call Claude with the full conversation so far and the list
            # of available tools.  Claude will either:
            #   (a) respond with text  → we're done, or
            #   (b) respond with one or more tool_use blocks → execute them.
            # -----------------------------------------------------------
            yield {"type": "thinking", "data": {"iteration": iteration}}

            response = await self._client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=self.system_prompt or "You are a helpful assistant. Use the provided tools when needed to answer questions accurately.",
                messages=messages,
                tools=tools,
            )

            # -----------------------------------------------------------
            # Check the stop_reason to decide what to do next.
            #
            # - "end_turn"  → Claude is done talking; extract text.
            # - "tool_use"  → Claude wants to call one or more tools.
            # -----------------------------------------------------------
            if response.stop_reason == "end_turn":
                # Extract the final text from the response content blocks.
                text = _extract_text(response)
                # Append the assistant turn to the conversation for memory.
                messages.append({"role": "assistant", "content": response.content})
                yield {"type": "message", "data": {"text": text}}
                return

            # -----------------------------------------------------------
            # STEP 2 — ACT
            #
            # The response contains tool_use content blocks.  We need to:
            #   1. Record the full assistant turn (text + tool_use blocks).
            #   2. Execute each tool call via the skill registry.
            #   3. Build tool_result content blocks with the outputs.
            # -----------------------------------------------------------

            # Record the assistant turn exactly as returned (may contain
            # a mix of text and tool_use blocks).
            messages.append({"role": "assistant", "content": response.content})

            # Gather tool results for every tool_use block in the response.
            tool_results: list[dict[str, Any]] = []

            for block in response.content:
                if block.type != "tool_use":
                    continue

                tool_name = block.name
                tool_input = block.input

                yield {
                    "type": "tool_call",
                    "data": {
                        "name": tool_name,
                        "input": tool_input,
                        "tool_use_id": block.id,
                    },
                }

                # Look up the skill and execute it.
                skill = self.registry.get(tool_name)
                if skill is None:
                    output = f"Error: unknown tool '{tool_name}'."
                else:
                    try:
                        output = await skill.execute(**tool_input)
                    except Exception as exc:
                        output = f"Error executing {tool_name}: {exc}"

                yield {
                    "type": "tool_result",
                    "data": {"name": tool_name, "output": output},
                }

                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": output,
                    }
                )

            # -----------------------------------------------------------
            # STEP 3 — OBSERVE
            #
            # Append the tool results as a user turn so Claude can see
            # what each tool returned.  Then loop back to STEP 1.
            # -----------------------------------------------------------
            messages.append({"role": "user", "content": tool_results})

        # If we've exhausted all iterations without a final text response,
        # yield an error so the caller knows the loop was cut short.
        yield {
            "type": "error",
            "data": {"text": f"Agent stopped after {self.max_iterations} iterations without a final response."},
        }


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _extract_text(response: anthropic.types.Message) -> str:
    """Pull plain-text content out of an Anthropic Message."""
    parts: list[str] = []
    for block in response.content:
        if hasattr(block, "text"):
            parts.append(block.text)
    return "\n".join(parts)
