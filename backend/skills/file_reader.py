"""FileReaderSkill — read files from a sandboxed directory."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from .base import Skill

SANDBOX_DIR = Path("/tmp/skillforge-sandbox")

_MAX_LENGTH = 8000


class FileReaderSkill(Skill):
    """Reads a file from the sandboxed ``/tmp/skillforge-sandbox/`` directory.

    Path traversal is blocked — the resolved path must remain inside the
    sandbox.  Returns the file content truncated to 8 000 characters.
    """

    @property
    def name(self) -> str:
        return "file_reader"

    @property
    def description(self) -> str:
        return (
            "Read the contents of a file inside the sandbox directory "
            "(/tmp/skillforge-sandbox/). Returns plain text, truncated to ~8 000 chars."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": (
                        "Relative path inside the sandbox, e.g. 'notes.txt' "
                        "or 'data/report.csv'."
                    ),
                },
            },
            "required": ["path"],
        }

    async def execute(self, **kwargs: Any) -> str:
        rel_path: str = kwargs["path"]

        # Ensure the sandbox exists.
        SANDBOX_DIR.mkdir(parents=True, exist_ok=True)

        target = (SANDBOX_DIR / rel_path).resolve()

        # Block path traversal.
        if not str(target).startswith(str(SANDBOX_DIR.resolve())):
            return "Error: path traversal is not allowed."

        if not target.is_file():
            return f"Error: '{rel_path}' not found in sandbox."

        try:
            content = target.read_text(errors="replace")
            return content[:_MAX_LENGTH]
        except Exception as exc:
            return f"Error reading file: {exc}"
