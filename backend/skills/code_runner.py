"""CodeRunnerSkill — execute Python code in a subprocess with a timeout."""

from __future__ import annotations

import asyncio
import sys
from typing import Any

from .base import Skill

_TIMEOUT_SECONDS = 5
_MAX_OUTPUT = 4000


class CodeRunnerSkill(Skill):
    """Runs a snippet of Python code in a subprocess.

    Execution is capped at 5 seconds.  Both stdout and stderr are captured and
    returned.  The subprocess inherits no special privileges — this is a basic
    convenience sandbox, **not** a security boundary.
    """

    @property
    def name(self) -> str:
        return "code_runner"

    @property
    def description(self) -> str:
        return (
            "Execute a Python code snippet and return its stdout/stderr. "
            "Execution is limited to 5 seconds."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "Python source code to execute.",
                },
            },
            "required": ["code"],
        }

    async def execute(self, **kwargs: Any) -> str:
        code: str = kwargs["code"]
        try:
            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                "-c",
                code,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=_TIMEOUT_SECONDS
            )
            output_parts: list[str] = []
            if stdout:
                output_parts.append(stdout.decode(errors="replace"))
            if stderr:
                output_parts.append(f"[stderr]\n{stderr.decode(errors='replace')}")
            result = "\n".join(output_parts).strip() or "(no output)"
            return result[:_MAX_OUTPUT]
        except asyncio.TimeoutError:
            proc.kill()
            return "Error: execution timed out (5 s limit)."
        except Exception as exc:
            return f"Error: {exc}"
