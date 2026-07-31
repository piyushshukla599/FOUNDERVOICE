from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..db import connect, dumps, loads, utc_now
from ..services import deepseek

router = APIRouter(prefix="/practice", tags=["practice"])


class PracticeStart(BaseModel):
    pitch_context: str = Field(default="I am pitching my startup.")
    session_id: str | None = None


class PracticeTurn(BaseModel):
    pitch_context: str
    history: list[dict[str, str]] = Field(default_factory=list)
    founder_message: str
    session_id: str | None = None


@router.post("/start")
async def start_practice(body: PracticeStart) -> dict[str, Any]:
    history = [{"role": "user", "content": "Start the mock investor meeting. Ask your first hard question."}]
    result = await deepseek.practice_investor_reply(history, body.pitch_context)
    with connect() as conn:
        conn.execute(
            "INSERT INTO practice_turns (session_id, role, content, scores_json, created_at) VALUES (?, ?, ?, ?, ?)",
            (body.session_id, "investor", result["reply"], dumps(result["scores"]), utc_now()),
        )
        conn.commit()
    return {"reply": result["reply"], "scores": result["scores"], "history": [
        {"role": "assistant", "content": result["reply"]}
    ]}


@router.post("/turn")
async def practice_turn(body: PracticeTurn) -> dict[str, Any]:
    history = list(body.history)
    history.append({"role": "user", "content": body.founder_message})
    result = await deepseek.practice_investor_reply(history, body.pitch_context)
    history.append({"role": "assistant", "content": result["reply"]})
    with connect() as conn:
        conn.execute(
            "INSERT INTO practice_turns (session_id, role, content, scores_json, created_at) VALUES (?, ?, ?, ?, ?)",
            (body.session_id, "founder", body.founder_message, None, utc_now()),
        )
        conn.execute(
            "INSERT INTO practice_turns (session_id, role, content, scores_json, created_at) VALUES (?, ?, ?, ?, ?)",
            (body.session_id, "investor", result["reply"], dumps(result["scores"]), utc_now()),
        )
        conn.commit()
    return {"reply": result["reply"], "scores": result["scores"], "history": history}


@router.get("/history")
def practice_history(limit: int = 40) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM practice_turns ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    out = []
    for r in rows:
        item = dict(r)
        item["scores"] = loads(item.pop("scores_json"), None)
        out.append(item)
    return list(reversed(out))
