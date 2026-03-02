"""WebFetcherSkill — fetch a URL and extract its text content."""

from __future__ import annotations

import re
from typing import Any

import httpx

from .base import Skill

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s{2,}")

_MAX_LENGTH = 4000


def _html_to_text(html: str) -> str:
    """Crude but dependency-free HTML → plain text conversion."""
    # Strip script/style blocks entirely.
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.S | re.I)
    text = _TAG_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text).strip()
    return text[:_MAX_LENGTH]


class WebFetcherSkill(Skill):
    """Fetches a URL and returns the page's text content.

    Uses ``httpx`` (already a dependency of the Anthropic SDK) so no extra
    packages are needed.  The raw HTML is stripped to plain text and truncated
    to avoid blowing up context windows.
    """

    @property
    def name(self) -> str:
        return "web_fetcher"

    @property
    def description(self) -> str:
        return (
            "Fetch a web page by URL and return its text content "
            "(HTML tags stripped, truncated to ~4 000 chars)."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The URL to fetch.",
                },
            },
            "required": ["url"],
        }

    async def execute(self, **kwargs: Any) -> str:
        url: str = kwargs["url"]
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
                resp = await client.get(url)
                resp.raise_for_status()
            return _html_to_text(resp.text)
        except Exception as exc:
            return f"Error fetching {url}: {exc}"
