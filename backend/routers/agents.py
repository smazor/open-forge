"""Router for agent CRUD endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

import database as db
from models.agent import AgentConfig, AgentCreate, AgentUpdate

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("", response_model=list[AgentConfig])
async def list_agents() -> list[AgentConfig]:
    return await db.list_agents()


@router.get("/{agent_id}", response_model=AgentConfig)
async def get_agent(agent_id: int) -> AgentConfig:
    agent = await db.get_agent(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("", response_model=AgentConfig, status_code=201)
async def create_agent(body: AgentCreate) -> AgentConfig:
    return await db.create_agent(
        name=body.name,
        system_prompt=body.system_prompt,
        skill_names=body.skill_names,
        temperature=body.temperature,
    )


@router.patch("/{agent_id}", response_model=AgentConfig)
async def update_agent(agent_id: int, body: AgentUpdate) -> AgentConfig:
    agent = await db.update_agent(
        agent_id,
        name=body.name,
        system_prompt=body.system_prompt,
        skill_names=body.skill_names,
        temperature=body.temperature,
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(agent_id: int) -> None:
    deleted = await db.delete_agent(agent_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Agent not found")
