"""Labs-specific coaching: score the drill they chose, using Voice Memory as context.

Do not contradict the drill (e.g. don't punish pitch variation during a pitch drill).
Do not dump a generic 'you're a bad founder' review. Help them succeed at THIS lab.
"""

from __future__ import annotations

from typing import Any

from .coach_templates import _fmt, _ts


# What this lab is allowed to judge. Other findings stay in "later" — not as failure.
LAB_FOCUS: dict[str, dict[str, Any]] = {
    "breath_box": {
        "specialty": "Breathing",
        "kinds": {"speaking_on_empty_breath", "weak_projection"},
        "metric": "breath_frequency",
        "win": "Steady breath between sentences. No gasping at the end of a line.",
        "help": "If you ran out of air, shorten the sentence. Inhale on the pause, then speak.",
    },
    "breath_diaphragm": {
        "specialty": "Breath support",
        "kinds": {"speaking_on_empty_breath", "weak_projection"},
        "metric": "energy",
        "win": "Belly expands on inhale; volume holds to the last word.",
        "help": "Hand on belly. Speak the claim on the exhale — don't lift shoulders.",
    },
    "warmup_hum": {
        "specialty": "Resonance warmup",
        "kinds": {"low_resonance"},
        "metric": None,
        "win": "Hum first, then speech with the same vibration in face/chest.",
        "help": "This is a warmup, not a pitch. Keep it easy. Fillers here are not a fail.",
    },
    "lip_trills": {
        "specialty": "Resonance warmup",
        "kinds": {"low_resonance"},
        "metric": None,
        "win": "Easy lips, then three sentences with the same ease.",
        "help": "Don't force volume. Carry the trill ease into the first spoken line.",
    },
    "chest_resonance": {
        "specialty": "Resonance",
        "kinds": {"low_resonance", "weak_projection"},
        "metric": None,
        "win": "Voice sits lower and warmer, not thin in the throat.",
        "help": "Keep the 'mmm' buzz when you open to vowels.",
    },
    "filler_fast": {
        "specialty": "Fillers",
        "kinds": {"filler"},
        "metric": "filler_rate",
        "win": "Silence instead of um/uh/like. Catch them as they happen.",
        "help": "When you feel a filler coming, close your mouth and breathe.",
    },
    "pause_drill_3": {
        "specialty": "Pauses",
        "kinds": {"missing_pause", "too_fast", "long_pause"},
        "metric": "pause_quality",
        "win": "A real 0.6–0.8s pause after each hook or claim.",
        "help": "Mark the pause in your script. Count 'one' silently after the hook.",
    },
    "strategic_pause": {
        "specialty": "Pauses",
        "kinds": {"missing_pause", "too_fast"},
        "metric": "pause_quality",
        "win": "One full second before the key term and after the claim.",
        "help": "The pause is the point of this drill — it is not 'dead air'.",
    },
    "confidence_stance": {
        "specialty": "Confidence",
        "kinds": {"confidence_drop", "too_fast", "too_quiet_variable"},
        "metric": "confidence_est",
        "win": "Second take 10% slower, planted, same volume start to end.",
        "help": "Don't rush to 'correct' yourself. Slow the second pass on purpose.",
    },
    "one_liner": {
        "specialty": "Opening",
        "kinds": {"too_fast", "missing_pause", "filler"},
        "metric": "wpm",
        "win": "Company in one breath + pause after the hook. ~130 WPM.",
        "help": "Finish the first sentence. Pause. Then the rest.",
    },
    "consonant_finish": {
        "specialty": "Articulation",
        "kinds": {"pronunciation_issue", "drop_technical_endings"},
        "metric": "clarity",
        "win": "Audible t/d/k/s on endings.",
        "help": "Over-finish today. It will sound extra; that's the drill.",
    },
    "hard_word_ladder": {
        "specialty": "Pronunciation",
        "kinds": {"pronunciation_issue"},
        "metric": "clarity",
        "win": "Hard words clear at slow, then normal, then presentation speed.",
        "help": "You are practicing words, not pitching. Slow is success here.",
    },
    "articulation_twisters": {
        "specialty": "Articulation",
        "kinds": {"pronunciation_issue"},
        "metric": "clarity",
        "win": "Twisters stay intelligible when you speed up.",
        "help": "Accuracy first. Speed second. Don't skip endings to go faster.",
    },
    "pronunciation_tech": {
        "specialty": "Technical words",
        "kinds": {"pronunciation_issue", "drop_technical_endings"},
        "metric": "clarity",
        "win": "Product terms land clean at presentation speed.",
        "help": "Say the term, pause, then the meaning. Don't swallow the last syllable.",
    },
    "pitch_variation": {
        "specialty": "Pitch / melody",
        "kinds": {"monotone"},
        "metric": "monotone_score",
        "win": "Five colors of the same sentence — flat is only take 1.",
        "help": "Changing pitch is the assignment. We will not mark variation as a mistake.",
    },
    "emphasis_keywords": {
        "specialty": "Emphasis",
        "kinds": {"monotone"},
        "metric": "monotone_score",
        "win": "Only the 5 marked words lift. The rest stays calm.",
        "help": "Don't punch every word. One lift per keyword.",
    },
    "open_vowels": {
        "specialty": "Projection",
        "kinds": {"weak_projection", "too_quiet_variable"},
        "metric": None,
        "win": "Open space in the mouth; volume without shout.",
        "help": "Exaggerate ah/oh/ay first, then shrink 20% and keep the space.",
    },
    "projection_support": {
        "specialty": "Projection",
        "kinds": {"weak_projection", "speaking_on_empty_breath"},
        "metric": None,
        "win": "Far-wall volume from breath, same at start and end of the line.",
        "help": "Don't shout. Support. If the last word dies, you ran out of air — shorter line.",
    },
    "board_update": {
        "specialty": "Story structure",
        "kinds": {"missing_pause", "too_fast", "weak_transitions"},
        "metric": "pause_quality",
        "win": "Shipped / slipped / next — one pause per beat.",
        "help": "Three beats. Don't blend them. Pause is the structure.",
    },
    "story_arc": {
        "specialty": "Storytelling",
        "kinds": {"missing_pause", "too_fast"},
        "metric": "pause_quality",
        "win": "Problem → solution → traction with a pause at each turn.",
        "help": "Name the turn: 'That's the problem.' Pause. Then solution.",
    },
    "executive_open": {
        "specialty": "Executive opening",
        "kinds": {"too_fast", "filler", "missing_pause"},
        "metric": "wpm",
        "win": "30s intro at 130–140 WPM, one planned breath.",
        "help": "If you rushed, redo only the first 10 seconds slower. That's the win.",
    },
    "executive_presence": {
        "specialty": "Authority",
        "kinds": {"too_fast", "confidence_drop", "too_quiet_variable"},
        "metric": "executive_presence",
        "win": "Second take slower, finished endings, final pause.",
        "help": "The rushed first take is allowed. The second take is the drill.",
    },
    "tech_explain": {
        "specialty": "Clarity",
        "kinds": {"pronunciation_issue", "too_fast", "drop_technical_endings"},
        "metric": "clarity",
        "win": "Non-expert can follow. Endings finished. ~130 WPM.",
        "help": "One idea per sentence. Pause after the term.",
    },
    "investor_ask": {
        "specialty": "The ask",
        "kinds": {"too_fast", "filler", "missing_pause"},
        "metric": "wpm",
        "win": "Ask in 45s. Pause before the number. Calm.",
        "help": "Don't bury the number. Pause, then say it once, clearly.",
    },
    "hard_question": {
        "specialty": "Pressure Q&A",
        "kinds": {"confidence_drop", "too_fast", "filler"},
        "metric": "confidence_est",
        "win": "Exhale. 1s pause. Headline first.",
        "help": "You are not being graded on a perfect pitch. Lead with one sentence.",
    },
}

DEFAULT_FOCUS = {
    "specialty": "This drill",
    "kinds": set(),
    "metric": None,
    "win": "Hit the written intent of the drill.",
    "help": "Stay on this skill. Other habits can wait for the matching lab.",
}

# What to say, how to say it, what it means. Then similar labs.
LAB_GUIDE: dict[str, dict[str, Any]] = {
    "breath_box": {
        "speak": "Inhale. Hold. We ship tomorrow. Exhale. Hold.",
        "how": "Breathe on a 4-count. Speak only on the exhale. Do not talk while you inhale.",
        "sense": "This lab trains air. If you run out of breath, the last words die. Pause is where you refill.",
        "similar": ["breath_diaphragm", "projection_support"],
    },
    "breath_diaphragm": {
        "speak": "Our customers wait two weeks. We cut that to two days.",
        "how": "Hand on belly. Belly out on inhale. Speak the whole claim on one easy exhale. Shoulders stay still.",
        "sense": "Support from the belly keeps volume to the last word. Throat pushing is not the drill.",
        "similar": ["breath_box", "projection_support"],
    },
    "warmup_hum": {
        "speak": "Mmm… We make onboarding simple.",
        "how": "Hum until you feel buzz in face or chest. Then open to the sentence with the same buzz. Easy, not loud.",
        "sense": "Warmth comes from vibration, not from forcing. This is a warmup, not a pitch.",
        "similar": ["lip_trills", "chest_resonance"],
    },
    "lip_trills": {
        "speak": "We are building a faster way to hire.",
        "how": "Lip trill for a few seconds. Then say the sentence with the same easy lips. Do not shout.",
        "sense": "Tight lips make a thin voice. Ease first, then words.",
        "similar": ["warmup_hum", "chest_resonance"],
    },
    "chest_resonance": {
        "speak": "This is the product. It saves founders an hour a day.",
        "how": "Start on mmm in the chest. Open to ah. Keep that lower, warmer place when you speak.",
        "sense": "A chesty voice sounds present. A throat-only voice sounds small.",
        "similar": ["warmup_hum", "open_vowels"],
    },
    "filler_fast": {
        "speak": "We sell to mid-market teams. They switch in 30 days. Retention is 94 percent.",
        "how": "If you feel um or like coming, close your mouth. Breathe. Then say the next word. Silence is allowed.",
        "sense": "Fillers sound like you are unsure. A quiet beat sounds like control.",
        "similar": ["pause_drill_3", "confidence_stance"],
    },
    "pause_drill_3": {
        "speak": "We cut onboarding from 14 days to 48 hours. That is the product.",
        "how": "Say the first sentence. Stop. Count one in your head. Then say the second sentence. Do not rush the gap.",
        "sense": "The pause is the point. It lets people hear the claim. No pause = the idea never lands.",
        "similar": ["strategic_pause", "one_liner", "executive_open"],
    },
    "strategic_pause": {
        "speak": "The key term is payback period. Ours is four months.",
        "how": "Pause one full second before payback period. Pause again after four months. Those two silences are the drill.",
        "sense": "Key words need space. If you glue them to the rest, they disappear.",
        "similar": ["pause_drill_3", "emphasis_keywords", "tech_explain"],
    },
    "confidence_stance": {
        "speak": "We are raising 1.2 million to scale outbound.",
        "how": "Feet planted. Say it once at your normal speed. Say it again 10 percent slower. Same volume start to end.",
        "sense": "When stakes rise, people speed up and get quieter. Slow on purpose is confidence.",
        "similar": ["hard_question", "executive_presence", "investor_ask"],
    },
    "one_liner": {
        "speak": "We help founders sound clear in rooms that decide money.",
        "how": "One breath. Finish the sentence. Pause. Then you may add one more line. Target about 130 words a minute.",
        "sense": "The first sentence is the hook. If you rush it, nobody knows who you are.",
        "similar": ["executive_open", "pause_drill_3", "investor_ask"],
    },
    "consonant_finish": {
        "speak": "We cut cost. We shipped fast. We kept trust.",
        "how": "Over-finish t, d, k, s. Cut. Cost. Shipped. Fast. Kept. Trust. It should sound extra today.",
        "sense": "Dropped endings make you sound sloppy. Clear endings make you sound sure.",
        "similar": ["hard_word_ladder", "pronunciation_tech", "articulation_twisters"],
    },
    "hard_word_ladder": {
        "speak": "Onboarding. Attribution. Retention. Payback.",
        "how": "Each word three times: slow, then normal, then pitch speed. Finish every syllable. Slow is success.",
        "sense": "Hard words get muddy when you speed up. This lab trains the mouth, not the pitch story.",
        "similar": ["pronunciation_tech", "consonant_finish", "tech_explain"],
    },
    "articulation_twisters": {
        "speak": "Red leather, yellow leather. Unique New York.",
        "how": "Slow and clear first. Then a little faster. Never skip an ending to go faster.",
        "sense": "This is tongue agility. Accuracy first. Speed second.",
        "similar": ["consonant_finish", "hard_word_ladder"],
    },
    "pronunciation_tech": {
        "speak": "Payback period is four months. Gross margin is 72 percent.",
        "how": "Say the term. Pause. Then the number. Do not swallow the last syllable of period or percent.",
        "sense": "Investors miss the number if the term is muddy. Clean term, then the figure.",
        "similar": ["hard_word_ladder", "tech_explain", "strategic_pause"],
    },
    "pitch_variation": {
        "speak": "This is the only number that matters.",
        "how": "Say it five times: flat, rising, falling, strong, calm. Changing pitch is the assignment.",
        "sense": "One-note speech makes every word equal, so nothing feels important.",
        "similar": ["emphasis_keywords", "executive_presence"],
    },
    "emphasis_keywords": {
        "speak": "We do not sell software. We sell time back.",
        "how": "Lift only time and back. The rest stays calm. One lift per keyword, not every word.",
        "sense": "Emphasis tells people what to remember. Punch everything and they remember nothing.",
        "similar": ["pitch_variation", "strategic_pause", "investor_ask"],
    },
    "open_vowels": {
        "speak": "Our goal is a simple, open, calm ask.",
        "how": "Open the mouth on ah, oh, ay. Then say it again 20 percent smaller, but keep the space.",
        "sense": "Closed vowels sound tight. Open space carries without shouting.",
        "similar": ["projection_support", "chest_resonance"],
    },
    "projection_support": {
        "speak": "Can you hear me at the back of the room?",
        "how": "Speak to a far wall. Same volume on the last word as the first. Do not shout. Use breath.",
        "sense": "If the end of the line dies, people miss the point. Support, don’t push.",
        "similar": ["breath_diaphragm", "open_vowels", "executive_presence"],
    },
    "board_update": {
        "speak": "What shipped: the new onboarding. What slipped: ads. What’s next: a 20-customer pilot.",
        "how": "Three beats. Pause after shipped. Pause after slipped. Pause after next. Do not blend them.",
        "sense": "Structure is the pause. Without beats, a board update is a blur.",
        "similar": ["story_arc", "pause_drill_3", "executive_open"],
    },
    "story_arc": {
        "speak": "The problem is slow hiring. The solution is a 48-hour screen. Traction is 40 teams in 90 days.",
        "how": "Name the turn. Pause. Then the next beat. Problem. Pause. Solution. Pause. Traction.",
        "sense": "A story needs turns. If you run it together, it is a list, not a story.",
        "similar": ["board_update", "strategic_pause", "one_liner"],
    },
    "executive_open": {
        "speak": "I’m [your name]. We help [who] do [what] in [time].",
        "how": "30 seconds. About 130–140 words a minute. One planned breath. Finish the first line before you add more.",
        "sense": "Openings set trust. A rushed intro sounds nervous even if the idea is good.",
        "similar": ["one_liner", "pause_drill_3", "investor_ask"],
    },
    "executive_presence": {
        "speak": "We are asking you to lead this round.",
        "how": "First take can be rushed. Second take: slower, finish every ending, pause at the end.",
        "sense": "Authority is the second take. Calm, finished, no fade.",
        "similar": ["confidence_stance", "projection_support", "investor_ask"],
    },
    "tech_explain": {
        "speak": "Attribution means we know which email led to the signup.",
        "how": "One idea per sentence. Say the term. Pause. Then the meaning in plain words. About 130 WPM.",
        "sense": "If a non-expert can’t follow, the term failed. Clarity is the lab, not speed.",
        "similar": ["pronunciation_tech", "strategic_pause", "hard_word_ladder"],
    },
    "investor_ask": {
        "speak": "We are raising 1.2 million on a 12 million cap.",
        "how": "Pause before 1.2 million. Say the number once. Calm. Do not bury it in extra words.",
        "sense": "The ask is the sentence people remember. Rush it and they miss the number.",
        "similar": ["one_liner", "confidence_stance", "emphasis_keywords"],
    },
    "hard_question": {
        "speak": "Growth is slow because we paused paid ads. Organic is compounding.",
        "how": "Exhale. Pause one second. Lead with the headline. Then one proof line. Do not ramble first.",
        "sense": "Hard questions make people speed up. Headline first sounds like you are in control.",
        "similar": ["confidence_stance", "filler_fast", "investor_ask"],
    },
}


def lab_guide(key: str) -> dict[str, Any]:
    return dict(LAB_GUIDE.get(key) or {})


def build_lab_review(
    *,
    exercise_key: str,
    title: str,
    description: str,
    metrics: dict[str, Any],
    events: list[dict[str, Any]],
    memory: dict[str, Any],
) -> str:
    spec = LAB_FOCUS.get(exercise_key or "", DEFAULT_FOCUS)
    kinds: set[str] = spec.get("kinds") or set()
    relevant = [e for e in (events or []) if (e.get("kind") or "") in kinds]
    relevant = sorted(relevant, key=lambda e: float(e.get("severity") or 0), reverse=True)[:3]

    patterns = memory.get("top_patterns") or []
    why = ""
    if patterns:
        top = patterns[0]
        why = f"From your overall voice: {top.get('label')} (seen {top.get('frequency')}×). This lab works that skill."

    lines = [
        f"Labs review — {title}",
        f"Specialty: {spec['specialty']}",
        "",
        "What this drill is for",
        spec["win"],
        "",
        "How you did on THIS lab (not a full founder verdict)",
    ]

    if not relevant:
        lines.append(
            "You stayed on-task. No flags on this specialty. That's a win — repeat once more to lock it."
        )
    else:
        lines.append("Coach for this drill only:")
        for e in relevant:
            obs = e.get("observation") or e.get("label") or e.get("kind")
            fix = e.get("fix") or spec["help"]
            lines.append(f"- {obs} ({_ts(e.get('start'), e.get('end'))})")
            lines.append(f"  Help: {fix}")

    lines += ["", "How to improve on this lab", spec["help"]]

    metric_key = spec.get("metric")
    if metric_key and metrics.get(metric_key) is not None:
        lines.append(f"Lab snapshot: {metric_key.replace('_', ' ')} {_fmt(metrics.get(metric_key))}.")

    wpm = metrics.get("wpm")
    if exercise_key in {"pitch_variation", "emphasis_keywords"}:
        lines.append(
            "Note: changing pitch/emphasis is required here. We will not treat that as monotone failure."
        )
    if exercise_key in {"warmup_hum", "lip_trills", "breath_box"}:
        lines.append(
            "Note: this is warmup. We will not grade you as if this were a pitch. Fillers and WPM are secondary."
        )
    elif wpm and float(wpm) > 170 and "too_fast" in kinds:
        lines.append(f"Pace in this clip ~{_fmt(wpm)} WPM — for this drill, slow the next take ~15%.")

    if why:
        lines += ["", "Why this lab fits you", why]
        lines.append("Other issues wait for their own lab. You chose this one — we coach this one.")

    lines += [
        "",
        "Next",
        "Do the same drill once more, or pick the recommended lab from your overall pattern.",
        "Daily habit: stay on one specialty per session.",
    ]
    return "\n".join(lines)


def exercise_catalog() -> dict[str, dict[str, Any]]:
    from ..db import connect, row_to_dict

    with connect() as conn:
        rows = conn.execute("SELECT * FROM exercises").fetchall()
    return {r["key"]: row_to_dict(r) for r in rows if r}


# Finding kind / Voice Memory pattern → one lab + plain-language "your voice sounds like…"
KIND_TO_LAB = {
    "too_fast": "pause_drill_3",
    "speed_overrun": "executive_open",
    "filler": "filler_fast",
    "missing_pause": "strategic_pause",
    "long_pause": "pause_drill_3",
    "monotone": "pitch_variation",
    "pronunciation_issue": "hard_word_ladder",
    "drop_technical_endings": "pronunciation_tech",
    "mumbling": "consonant_finish",
    "unclear": "consonant_finish",
    "confidence_drop": "confidence_stance",
    "speaking_on_empty_breath": "breath_box",
    "weak_projection": "projection_support",
    "too_quiet_variable": "projection_support",
    "low_resonance": "warmup_hum",
    "weak_transitions": "story_arc",
}

PATTERN_TO_LAB = {
    "rush_on_intro": "executive_open",
    "filler_overuse": "filler_fast",
    "missing_pauses": "strategic_pause",
    "monotone": "pitch_variation",
    "drop_technical_endings": "pronunciation_tech",
    "confidence_drop_qa": "confidence_stance",
    "speaking_on_empty_breath": "breath_box",
    "weak_projection": "projection_support",
    "low_resonance": "warmup_hum",
    "weak_transitions": "story_arc",
    "mumbling": "consonant_finish",
}

VOICE_SOUND = {
    "too_fast": "Your voice sounds rushed. Words pile up before people can catch the idea.",
    "speed_overrun": "Your voice speeds up in spots. Those stretches are hard to follow.",
    "filler": "Your voice sounds unsure in the gaps — um, like, and you know fill the quiet.",
    "missing_pause": "Your voice sounds packed. You don’t leave a beat, so claims blur together.",
    "long_pause": "Your voice drops into long silences that feel like you lost the thread.",
    "monotone": "Your voice stays on one note, so important words don’t stand out.",
    "pronunciation_issue": "Hard words sound muddy. Listeners have to guess the last syllable.",
    "drop_technical_endings": "Product words fade at the end. The term starts clear and finishes swallowed.",
    "mumbling": "Your voice sounds closed. Endings (t, d, k, s) disappear.",
    "unclear": "Some words don’t land. People would ask you to repeat.",
    "confidence_drop": "Your voice gets smaller when it matters — faster and quieter.",
    "speaking_on_empty_breath": "You sound like you run out of air. The last words of a line fade or rush.",
    "weak_projection": "Your voice sounds thin or far away. Volume dies before the sentence ends.",
    "too_quiet_variable": "Loudness jumps around. Some lines feel close, others drop away.",
    "low_resonance": "Your voice sounds light in the throat, not warm in the chest.",
    "weak_transitions": "Ideas run together. Problem, solution, and next don’t get their own beat.",
    "rush_on_intro": "Your opening sounds rushed. The first 20 seconds go too fast.",
    "filler_overuse": "Fillers show up a lot. They replace a clean pause while you find the next word.",
    "missing_pauses": "You skip the pause after a claim. Listeners don’t get a second to take it in.",
    "confidence_drop_qa": "When the question gets hard, you speed up and the ask gets quieter.",
}

FIX_LINE = {
    "pause_drill_3": "Practice the pause lab: a short quiet beat after each claim.",
    "executive_open": "Practice the opening lab: first 30 seconds slower, one planned breath.",
    "filler_fast": "Practice the filler lab: close your mouth instead of saying um.",
    "strategic_pause": "Practice the pause lab: one full second before the key word.",
    "pitch_variation": "Practice the pitch lab: same sentence, five different colors.",
    "hard_word_ladder": "Practice the hard-word lab: slow, then normal, then pitch speed.",
    "pronunciation_tech": "Practice the tech-word lab: finish every syllable of the product name.",
    "consonant_finish": "Practice the consonant lab: over-finish t, d, k, s today.",
    "confidence_stance": "Practice the stance lab: second take 10% slower, planted feet.",
    "breath_box": "Practice the breath lab: inhale on the pause, then speak.",
    "projection_support": "Practice the projection lab: same volume from first word to last.",
    "warmup_hum": "Practice the hum lab: warm the voice before you speak.",
    "story_arc": "Practice the story lab: problem, pause, solution, pause, traction.",
}


def voice_sound_for(key: str) -> str:
    return VOICE_SOUND.get(key) or ""


def lab_for_kind_or_pattern(kind: str = "", pattern: str = "", exercise: str = "") -> str:
    if exercise and (exercise in LAB_FOCUS or exercise in FIX_LINE):
        return exercise
    if kind in KIND_TO_LAB:
        return KIND_TO_LAB[kind]
    if pattern in PATTERN_TO_LAB:
        return PATTERN_TO_LAB[pattern]
    return ""


def why_this_lab(exercise: dict[str, Any], pattern_keys: set[str], patterns: list[dict[str, Any]]) -> str:
    target = exercise.get("target_pattern") or ""
    if target and target in pattern_keys:
        sound = voice_sound_for(target)
        if sound:
            return sound
        p = next((x for x in patterns if x.get("key") == target), None)
        label = (p or {}).get("label") or target.replace("_", " ")
        return f"We hear this in your voice: {label}."
    cat = (exercise.get("category") or "").lower()
    mapping = {
        "pause": "Helps if you rush or skip pauses.",
        "filler": "Helps if fillers show up under pressure.",
        "breathing": "Helps if you run out of air mid-sentence.",
        "articulation": "Helps if endings drop on technical words.",
        "pronunciation": "Helps if hard words get muddy.",
        "executive": "Helps openings, asks, and presence.",
        "pitch": "Helps if delivery sounds flat.",
        "resonance": "Helps if the voice sounds thin.",
        "projection": "Helps if volume dies at the end of lines.",
        "confidence": "Helps if you speed up when challenged.",
        "storytelling": "Helps structure: problem / solution / next.",
    }
    return mapping.get(cat, "Pick this if it is the skill you want to train today.")


def attach_sound(exercise: dict[str, Any]) -> dict[str, Any]:
    key = exercise.get("key") or ""
    target = exercise.get("target_pattern") or ""
    sound = voice_sound_for(target) or voice_sound_for(key)
    if not sound:
        sound = exercise.get("why") or ""
    exercise["sound"] = sound
    exercise["fix_line"] = FIX_LINE.get(key) or f"Practice this in Labs: {exercise.get('title') or key}."
    guide = lab_guide(key)
    exercise["speak"] = guide.get("speak") or exercise.get("description") or ""
    exercise["how"] = guide.get("how") or spec_help(key)
    exercise["sense"] = guide.get("sense") or exercise.get("why") or ""
    exercise["similar"] = list(guide.get("similar") or [])
    return exercise


def spec_help(key: str) -> str:
    return str((LAB_FOCUS.get(key) or DEFAULT_FOCUS).get("help") or "")


def similar_lab_recs(exercise_key: str, catalog: dict[str, dict[str, Any]] | None = None, limit: int = 3) -> list[dict[str, Any]]:
    guide = lab_guide(exercise_key)
    keys = [k for k in (guide.get("similar") or []) if k != exercise_key]
    cat = ((catalog or {}).get(exercise_key) or {}).get("category")
    if not keys and cat and catalog:
        keys = [k for k, row in catalog.items() if row and row.get("category") == cat and k != exercise_key]
    out: list[dict[str, Any]] = []
    for lab in keys[:limit]:
        row = dict((catalog or {}).get(lab) or {})
        title = row.get("title") or lab.replace("_", " ").title()
        g = lab_guide(lab)
        out.append(
            {
                "key": lab,
                "title": title,
                "description": row.get("description") or "",
                "duration_sec": row.get("duration_sec") or 120,
                "level": int(row.get("level") or 1),
                "category": row.get("category") or "",
                "sound": g.get("sense") or f"Same skill family as the lab you just did.",
                "fix_line": g.get("speak") and f'Speak this next: {g.get("speak")}' or FIX_LINE.get(lab),
                "speak": g.get("speak") or "",
                "how": g.get("how") or "",
                "sense": g.get("sense") or "",
                "source": "similar",
            }
        )
    return out


def recommend_labs_from_events(
    events: list[dict[str, Any]] | None,
    metrics: dict[str, Any] | None = None,
    *,
    skip_key: str | None = None,
    catalog: dict[str, dict[str, Any]] | None = None,
    limit: int = 3,
) -> list[dict[str, Any]]:
    """Map this session's findings to labs in easy words."""
    weights: dict[str, float] = {}
    sounds: dict[str, str] = {}
    for e in events or []:
        kind = str(e.get("kind") or "")
        lab = lab_for_kind_or_pattern(kind=kind, exercise=str(e.get("exercise") or ""))
        if not lab or lab == skip_key:
            continue
        weights[lab] = weights.get(lab, 0) + float(e.get("severity") or 1)
        if lab not in sounds:
            sounds[lab] = voice_sound_for(kind) or voice_sound_for(lab)

    m = metrics or {}
    wpm = m.get("wpm")
    if wpm is not None and float(wpm) >= 165 and "pause_drill_3" != skip_key:
        weights["pause_drill_3"] = weights.get("pause_drill_3", 0) + 1.5
        sounds.setdefault(
            "pause_drill_3",
            f"Your pace was about {int(float(wpm))} words a minute. That sounds rushed for a founder pitch.",
        )
    fillers = m.get("filler_count")
    if fillers is not None and float(fillers) >= 4 and "filler_fast" != skip_key:
        weights["filler_fast"] = weights.get("filler_fast", 0) + 1.2
        sounds.setdefault("filler_fast", voice_sound_for("filler"))
    mono = m.get("monotone_score")
    if mono is not None and float(mono) >= 55 and "pitch_variation" != skip_key:
        weights["pitch_variation"] = weights.get("pitch_variation", 0) + 1.0
        sounds.setdefault("pitch_variation", voice_sound_for("monotone"))

    ranked = sorted(weights.items(), key=lambda kv: -kv[1])[:limit]
    out: list[dict[str, Any]] = []
    for lab_key, _w in ranked:
        row = dict((catalog or {}).get(lab_key) or {})
        title = row.get("title") or lab_key.replace("_", " ").title()
        rec = {
            "key": lab_key,
            "title": title,
            "description": row.get("description") or "",
            "duration_sec": row.get("duration_sec") or 120,
            "level": int(row.get("level") or 1),
            "category": row.get("category") or "",
            "sound": sounds.get(lab_key) or voice_sound_for(lab_key),
            "fix_line": FIX_LINE.get(lab_key) or f"Practice this in Labs: {title}.",
            "source": "session",
        }
        out.append(rec)
    return out


def recommend_labs_from_memory(
    patterns: list[dict[str, Any]] | None,
    catalog: dict[str, dict[str, Any]] | None = None,
    *,
    limit: int = 3,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for p in patterns or []:
        key = str(p.get("key") or "")
        lab = lab_for_kind_or_pattern(pattern=key)
        if not lab or lab in seen:
            continue
        seen.add(lab)
        row = dict((catalog or {}).get(lab) or {})
        title = row.get("title") or lab.replace("_", " ").title()
        sound = voice_sound_for(key) or f"We keep hearing this in your voice: {p.get('label') or key}."
        out.append(
            {
                "key": lab,
                "title": title,
                "description": row.get("description") or "",
                "duration_sec": row.get("duration_sec") or 120,
                "level": int(row.get("level") or 1),
                "category": row.get("category") or "",
                "sound": sound,
                "fix_line": FIX_LINE.get(lab) or f"Practice this in Labs: {title}.",
                "source": "memory",
                "pattern_label": p.get("label"),
            }
        )
        if len(out) >= limit:
            break
    return out
