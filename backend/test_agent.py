"""End-to-end test for the AgentEngine.

Creates an agent with calculator + code_runner skills, sends a math question,
and prints every event from the ReAct loop.
"""

import asyncio
import json

from agent import AgentEngine, ConversationMemory
from skills import CalculatorSkill, CodeRunnerSkill, SkillRegistry

SEP = "=" * 60


async def main() -> None:
    # -- Set up skills + registry ------------------------------------------
    registry = SkillRegistry()
    registry.register(CalculatorSkill())
    registry.register(CodeRunnerSkill())

    print(f"Skills: {[s.name for s in registry.list_skills()]}")
    print()

    # -- Create the agent engine -------------------------------------------
    engine = AgentEngine(
        registry,
        system_prompt=(
            "You are a helpful assistant. "
            "Use the calculator tool for math questions. "
            "Use the code_runner tool when you need to run Python code."
        ),
    )

    # -- Conversation memory -----------------------------------------------
    memory = ConversationMemory()

    # -- Send a question and stream events ---------------------------------
    question = "What is 25 * 48 + 17?"
    print(SEP)
    print(f"USER: {question}")
    print(SEP)
    print()

    async for event in engine.run(question, history=memory.get_history()):
        etype = event["type"]
        data = event["data"]

        if etype == "thinking":
            print(f"[iteration {data['iteration']}] Calling Claude...")

        elif etype == "tool_call":
            print(f"  -> TOOL CALL: {data['name']}({json.dumps(data['input'])})")

        elif etype == "tool_result":
            print(f"  <- TOOL RESULT [{data['name']}]: {data['output']}")

        elif etype == "message":
            print()
            print(SEP)
            print(f"ASSISTANT: {data['text']}")
            print(SEP)
            # Save the full exchange to memory.
            memory.add("user", question)
            memory.add("assistant", data["text"])

        elif etype == "error":
            print(f"  !! ERROR: {data['text']}")

    print()
    print(f"Memory has {len(memory.get_history())} messages stored.")


if __name__ == "__main__":
    asyncio.run(main())
