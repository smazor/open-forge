"""Smoke-test for the SkillForge skill system.

Registers all four skills, runs each with sample input, and prints the
Anthropic tool definitions.
"""

import asyncio
import json
from pathlib import Path

from skills import (
    CalculatorSkill,
    CodeRunnerSkill,
    FileReaderSkill,
    SkillRegistry,
    WebFetcherSkill,
)

SANDBOX_DIR = Path("/tmp/skillforge-sandbox")

SEPARATOR = "-" * 60


async def main() -> None:
    # -- Set up registry ---------------------------------------------------
    registry = SkillRegistry()
    registry.register(CalculatorSkill())
    registry.register(WebFetcherSkill())
    registry.register(FileReaderSkill())
    registry.register(CodeRunnerSkill())

    print(f"Registered {len(registry.list_skills())} skills:")
    for s in registry.list_skills():
        print(f"  - {s.name}: {s.description[:60]}…")
    print()

    # -- Run each skill ----------------------------------------------------
    print(SEPARATOR)
    print("1) CalculatorSkill")
    print(SEPARATOR)
    result = await registry.get("calculator").execute(expression="2 ** 10 + 3 * 7")
    print(f"   2 ** 10 + 3 * 7 = {result}")
    print()

    print(SEPARATOR)
    print("2) WebFetcherSkill")
    print(SEPARATOR)
    result = await registry.get("web_fetcher").execute(url="https://httpbin.org/html")
    print(f"   Fetched {len(result)} chars. Preview: {result[:120]}…")
    print()

    print(SEPARATOR)
    print("3) FileReaderSkill")
    print(SEPARATOR)
    # Create a sample file in the sandbox.
    SANDBOX_DIR.mkdir(parents=True, exist_ok=True)
    sample = SANDBOX_DIR / "hello.txt"
    sample.write_text("Hello from SkillForge sandbox!\nLine 2.\n")
    result = await registry.get("file_reader").execute(path="hello.txt")
    print(f"   {result.strip()}")
    print()

    print(SEPARATOR)
    print("4) CodeRunnerSkill")
    print(SEPARATOR)
    result = await registry.get("code_runner").execute(
        code="import sys; print(f'Python {sys.version}')\nprint(sum(range(101)))"
    )
    print(f"   {result}")
    print()

    # -- Tool definitions --------------------------------------------------
    print(SEPARATOR)
    print("Anthropic tool definitions")
    print(SEPARATOR)
    print(json.dumps(registry.tool_definitions(), indent=2))


if __name__ == "__main__":
    asyncio.run(main())
