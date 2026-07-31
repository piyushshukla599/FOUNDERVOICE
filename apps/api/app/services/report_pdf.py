"""Session PDF report — richer layout using metrics + payload + findings."""

from __future__ import annotations

from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..config import get_settings
from ..db import connect, loads, row_to_dict


def _p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(str(text or "")).replace("\n", "<br/>"), style)


def _metric_row(label: str, value: Any) -> list[str]:
    if value is None:
        return [label, "—"]
    if isinstance(value, float):
        return [label, f"{value:.1f}"]
    return [label, str(value)]


def generate_pdf(session_id: str) -> Path:
    settings = get_settings()
    with connect() as conn:
        session = row_to_dict(conn.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone())
        metrics = row_to_dict(conn.execute("SELECT * FROM metrics WHERE session_id=?", (session_id,)).fetchone())
        events = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM events WHERE session_id=? ORDER BY severity DESC LIMIT 24",
                (session_id,),
            ).fetchall()
        ]

    if not session:
        raise ValueError("Session not found")

    payload = loads((metrics or {}).get("payload_json"), {}) or {}
    professional = payload.get("professional") or {}
    focus = loads(session.get("focus_json"), {}) or {}
    mode = session.get("mode") or "free"

    out = settings.reports_dir / f"{session_id}.pdf"
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "FVTitle",
        parent=styles["Title"],
        fontSize=20,
        textColor=colors.HexColor("#1a1510"),
        spaceAfter=6,
    )
    h2 = ParagraphStyle(
        "FVH2",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#3d3429"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        "FVBody",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#2a241c"),
    )
    muted = ParagraphStyle(
        "FVMuted",
        parent=body,
        textColor=colors.HexColor("#6b5e4e"),
        fontSize=8.5,
    )

    doc = SimpleDocTemplate(
        str(out),
        pagesize=letter,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )
    story: list[Any] = []
    story.append(Paragraph("FounderVoice AI — Session Report", title_style))
    story.append(_p(session.get("title") or session_id, h2))
    story.append(
        _p(
            f"Date: {session.get('created_at')} · Duration: {float(session.get('duration') or 0):.1f}s · "
            f"Mode: {mode} · Status: {session.get('status')}",
            muted,
        )
    )
    if focus.get("exercise_title"):
        story.append(_p(f"Focus: {focus.get('exercise_title')}", body))
        if focus.get("exercise_description"):
            story.append(_p(str(focus.get("exercise_description")), muted))

    story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#c4a35a")))
    story.append(Spacer(1, 8))

    if metrics:
        story.append(Paragraph("Core metrics (estimates where noted)", h2))
        rows = [
            _metric_row("WPM", metrics.get("wpm")),
            _metric_row("Fillers", metrics.get("filler_count")),
            _metric_row("Clarity", metrics.get("clarity")),
            _metric_row("Pause quality", metrics.get("pause_quality")),
            _metric_row("Confidence (est.)", metrics.get("confidence_est")),
            _metric_row("Executive presence", metrics.get("executive_presence") or metrics.get("ceo_presence")),
            _metric_row("Trust (est.)", metrics.get("founder_trust")),
            _metric_row("Monotone (est.)", metrics.get("monotone_score")),
            _metric_row("Fundraising readiness (est.)", metrics.get("fundraising_readiness")),
            _metric_row("Would invest (est.)", metrics.get("investor_would_invest")),
        ]
        table = Table(rows, colWidths=[2.6 * inch, 4.2 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#6b5e4e")),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.25, colors.HexColor("#e5ddd0")),
                ]
            )
        )
        story.append(table)

    vq = professional.get("voice_quality") or {}
    if vq:
        story.append(Paragraph("Professional voice (estimates)", h2))
        story.append(_p(f"Voice quality score: {vq.get('score')}", body))
        if vq.get("reasoning"):
            story.append(_p(str(vq.get("reasoning")), muted))
        ep = professional.get("executive_presence") or {}
        if ep.get("reason"):
            story.append(_p(f"Executive presence: {ep.get('score')} — {ep.get('reason')}", muted))
        habit = professional.get("one_habit_next")
        if habit:
            story.append(_p(f"One habit next: {habit}", body))

    story.append(Paragraph("Coach summary", h2))
    summary = session.get("coach_summary") or "No summary yet."
    story.append(_p(summary, body))

    story.append(Paragraph("Root-cause findings", h2))
    if not events:
        story.append(_p("No findings recorded for this session.", muted))
    for e in events[:10]:
        meta = loads(e.get("meta_json"), {}) or {}
        label = e.get("label") or "Finding"
        cause = e.get("cause") or ""
        fix = e.get("fix") or ""
        evidence = meta.get("evidence") or ""
        start = e.get("start")
        stamp = f" @ {float(start):.1f}s" if start is not None else ""
        story.append(_p(f"{label}{stamp}", body))
        if cause:
            story.append(_p(f"Cause: {cause}", muted))
        if evidence:
            story.append(_p(f"Evidence: {evidence}", muted))
        if fix:
            story.append(_p(f"Fix: {fix}", muted))
        if e.get("exercise"):
            story.append(_p(f"Exercise: {e.get('exercise')}", muted))
        story.append(Spacer(1, 4))

    pitch = payload.get("pitch") or {}
    if pitch.get("summary"):
        story.append(Paragraph("Investor / pitch read (estimate)", h2))
        story.append(_p(str(pitch.get("summary")), body))

    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.4, color=colors.HexColor("#e5ddd0")))
    story.append(
        _p(
            "FounderVoice AI — local analysis. Emotion, breath, investor, and presence scores are estimates. "
            "We improve clarity and habits — never accent identity. "
            "Coaching powered by AI Executive Coach.",
            muted,
        )
    )

    doc.build(story)
    return out
