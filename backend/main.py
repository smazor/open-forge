from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database as db
from routers import agents, chat, skills
from skills import (
    CalculatorSkill,
    CodeRunnerSkill,
    FileReaderSkill,
    SkillRegistry,
    WebFetcherSkill,
)

# ---------------------------------------------------------------------------
# Skill registry (shared singleton)
# ---------------------------------------------------------------------------
registry = SkillRegistry()
registry.register(CalculatorSkill())
registry.register(WebFetcherSkill())
registry.register(FileReaderSkill())
registry.register(CodeRunnerSkill())


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init DB and inject registry into routers.
    await db.init_db()
    skills.set_registry(registry)
    chat.set_registry(registry)
    yield


app = FastAPI(title="SkillForge API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(skills.router)
app.include_router(agents.router)
app.include_router(chat.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "SkillForge"}
