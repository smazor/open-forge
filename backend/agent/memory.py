"""ConversationMemory — lightweight rolling message buffer.

Stores the most recent messages in a conversation so the agent engine can
pass history to Claude on each turn without unbounded growth.
"""

from __future__ import annotations

from typing import Any

_DEFAULT_MAX_MESSAGES = 20


class ConversationMemory:
    """FIFO buffer that keeps the last *max_messages* conversation turns.

    Each entry is a dict in Anthropic message format::

        {"role": "user" | "assistant", "content": ...}

    When the buffer is full, the oldest messages are silently dropped.

    Parameters
    ----------
    max_messages : int, optional
        Maximum number of messages to retain (default 20).
    """

    def __init__(self, max_messages: int = _DEFAULT_MAX_MESSAGES) -> None:
        self.max_messages = max_messages
        self._messages: list[dict[str, Any]] = []

    def add(self, role: str, content: Any) -> None:
        """Append a message and trim if over the limit."""
        self._messages.append({"role": role, "content": content})
        # Trim from the front, keeping the most recent messages.
        if len(self._messages) > self.max_messages:
            self._messages = self._messages[-self.max_messages :]

    def get_history(self) -> list[dict[str, Any]]:
        """Return a copy of the stored messages."""
        return list(self._messages)

    def clear(self) -> None:
        """Wipe all stored messages."""
        self._messages.clear()
