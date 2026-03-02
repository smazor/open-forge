"""CalculatorSkill — safe arithmetic evaluation."""

from __future__ import annotations

import ast
import operator
from typing import Any

from .base import Skill

# Whitelisted operators for safe evaluation.
_OPERATORS: dict[type, Any] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _safe_eval(node: ast.AST) -> float:
    """Recursively evaluate an AST node using only whitelisted operations."""
    if isinstance(node, ast.Expression):
        return _safe_eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp):
        op = _OPERATORS.get(type(node.op))
        if op is None:
            raise ValueError(f"Unsupported operator: {type(node.op).__name__}")
        return op(_safe_eval(node.left), _safe_eval(node.right))
    if isinstance(node, ast.UnaryOp):
        op = _OPERATORS.get(type(node.op))
        if op is None:
            raise ValueError(f"Unsupported unary operator: {type(node.op).__name__}")
        return op(_safe_eval(node.operand))
    raise ValueError(f"Unsupported expression node: {type(node).__name__}")


class CalculatorSkill(Skill):
    """Evaluates math expressions safely using AST parsing.

    Supports: +, -, *, /, //, %, ** and unary +/-.
    Rejects arbitrary code — only numeric literals and arithmetic operators are
    allowed.
    """

    @property
    def name(self) -> str:
        return "calculator"

    @property
    def description(self) -> str:
        return (
            "Evaluate a mathematical expression. Supports +, -, *, /, "
            "//, %, ** with standard precedence. Returns the numeric result."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "A math expression to evaluate, e.g. '2 + 3 * 4'.",
                },
            },
            "required": ["expression"],
        }

    async def execute(self, **kwargs: Any) -> str:
        expression: str = kwargs["expression"]
        try:
            tree = ast.parse(expression, mode="eval")
            result = _safe_eval(tree)
            return str(result)
        except Exception as exc:
            return f"Error: {exc}"
