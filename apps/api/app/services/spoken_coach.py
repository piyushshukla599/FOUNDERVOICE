"""Turn a finished session into something a coach would say out loud.

The written report and the spoken one are not the same artefact. A report can
open with a table of six metrics; a coach who opens that way has lost you by
the third number. So this does not read `coach_summary` aloud - it builds a
separate script from the same evidence, with the shape a person uses:

    verdict -> the one number that matters -> what went wrong -> why it went
    wrong -> what to do instead -> which lab fixes it -> go again

Every line is one idea, short enough to land and short enough to bill cheaply
(see ``tts.MAX_CHARS``). The rule templates below are the real implementation,
not a fallback of last resort: they always run, they are what gets spoken with
no API key, and when DeepSeek is configured it *rewrites* them line for line
rather than inventing a script of its own. That keeps the spoken coaching tied
to the same findings as the written coaching - a voice that contradicts the
report on screen is worse than no voice.
"""

from __future__ import annotations

import json
import logging
import re
from collections import Counter
from typing import Any

from . import tts

logger = logging.getLogger(__name__)

# The visitor waits through every line, so the script has a hard ceiling. Two
# findings coached properly beats five listed.
MAX_ISSUES = 2

SYSTEM_SPEAK = """You are an elite speaking coach talking to a founder, out loud, in the room.
You are rewriting lines that will be read by a text-to-speech voice.

Rules:
- Keep exactly the same number of lines, in the same order, saying the same thing.
- Never add a finding, a number, or a claim that is not already in the line you were given.
- Spoken English: contractions, second person, one idea per line, under 30 words.
- No markdown, no bullet characters, no headings, no emoji, no stage directions.
- Do not greet twice, do not sign off, do not mention that you are an AI.
Return ONLY a JSON array of strings, same length as the input array."""


def _num(value: Any, default: float | None = None) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _line(line_id: str, kind: str, text: str, **meta: Any) -> dict[str, Any]:
    return {"id": line_id, "kind": kind, "text": tts.speakable(text), **meta}


def _sentence(text: str) -> str:
    """Findings are written as mid-sentence fragments; spoken, they start one.

    And end one: a line with no full stop is read with the pitch still up, as
    though more is coming, which is exactly how a coach sounds when they have
    lost their thread.
    """
    text = text.strip()
    if not text:
        return ""
    text = text[0].upper() + text[1:]
    return text if text[-1] in ".!?…" else text + "."


def _clause(text: str) -> str:
    """The reverse: a finding label continuing a sentence someone has begun.

    Labels are stored capitalised ("Missing pause in long stretch") because
    they head a card in the report. Read out after "The main thing:" that
    capital does nothing, so it goes - unless the word is an acronym or a
    product name, which the second character gives away.
    """
    text = text.strip().rstrip(".")
    if not text or (len(text) > 1 and text[1].isupper()):
        return text
    return text[0].lower() + text[1:]


def _group(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse repeats into one finding that knows how often it happened.

    The analyser emits one event per occurrence, so a founder who never pauses
    gets six identical "missing pause" findings. Read aloud that is the coach
    saying the same sentence six times; counted, it becomes the evidence.
    """
    grouped: dict[str, dict[str, Any]] = {}
    for event in events:
        key = str(event.get("kind") or event.get("label") or "").strip().lower()
        if not key:
            continue
        seen = grouped.get(key)
        if seen is None:
            grouped[key] = {**event, "_count": 1}
            continue
        seen["_count"] += 1
        # Keep the worst instance: it is the one worth describing.
        if (_num(event.get("severity"), 0) or 0) > (_num(seen.get("severity"), 0) or 0):
            grouped[key] = {**event, "_count": seen["_count"]}
    return sorted(grouped.values(), key=lambda e: -(_num(e.get("severity"), 0.5) or 0.5))


def brief_lines(seconds: int = 45, name: str = "") -> list[dict[str, Any]]:
    """What the coach says before the clock starts.

    Spoken, not written, because the founder is about to look away from the
    screen - that is the whole point of the drill.
    """
    who = f" {name.strip()}" if name.strip() else ""
    return [
        _line("brief-1", "open", f"Alright{who}. You have {seconds} seconds to pitch me."),
        _line("brief-2", "open", "Who it's for, what it does, why now, and what you want from me."),
        _line("brief-3", "open", "Don't read. Talk to me like I'm across the table. Starting now."),
    ]


def _verdict(score: int) -> str:
    if score >= 82:
        return "That was strong. You sounded like someone who has run this pitch before."
    if score >= 70:
        return "Solid. The pitch is there. The delivery is what's costing you."
    if score >= 58:
        return "It's rough, but it's fixable. The content held up better than the voice did."
    return "Honestly, that one got away from you. Let's find out where."


# The pace a room is comfortable with. Stated out loud every time it is missed,
# because "you spoke too fast" is an opinion and "177 against 130 to 145" is not.
GOOD_PACE = "130 to 145"


def _pace_note(wpm: float | None) -> str:
    if wpm is None:
        return ""
    speed = int(round(wpm))
    if wpm > 168:
        return (
            f"Your pace was {speed} words a minute. A room wants about {GOOD_PACE}, "
            "so you're well over it, and that fast reads as nervous rather than urgent."
        )
    if wpm > 152:
        return (
            f"You ran at {speed} words a minute, against a comfortable {GOOD_PACE}. "
            "A shade fast, so your best lines don't get room to land."
        )
    if wpm < 105:
        return (
            f"You were at {speed} words a minute, where a room wants {GOOD_PACE}. "
            "That's careful, and careful reads as unsure."
        )
    if wpm < 128:
        # Close enough not to be a fault, far enough that calling it "right in
        # the range" would be a lie the listener can check.
        return (
            f"Your pace was {speed} words a minute, just under the {GOOD_PACE} a room "
            "settles into. Comfortable. Don't let it drift any slower."
        )
    return f"Your pace was {speed} words a minute, right in the {GOOD_PACE} a room wants. Keep that."


def _filler_note(events: list[dict[str, Any]], metrics: dict[str, Any]) -> str:
    """Name the word, not the category.

    "Eight fillers" is a score. "You said um six times" is something you can
    hear yourself doing, which is the only version anyone acts on.
    """
    counts: Counter[str] = Counter()
    for event in events:
        if str(event.get("kind") or "") != "filler":
            continue
        meta = event.get("meta") or {}
        phrase = str(meta.get("phrase") or "").strip()
        if phrase:
            counts[phrase] += 1

    total = int(_num(metrics.get("filler_count"), 0) or 0) or sum(counts.values())
    if total < 2:
        return ""

    if counts:
        word, times = counts.most_common(1)[0]
        rest = total - times
        line = f'You said "{word}" {times} times'
        if rest > 0:
            line += f", and {total} fillers altogether"
        return (
            line + ". Every one of them sits where you weren't sure yet, "
            "and that's what a listener hears as low confidence."
        )
    return (
        f"I counted {total} filler words. Each one is a place you could have "
        "just stopped talking for half a second instead."
    )


def _certainty_note(metrics: dict[str, Any]) -> str:
    """Only spoken when something is actually off. Silence beats filler praise."""
    confidence = _num(metrics.get("confidence_est"))
    monotone = _num(metrics.get("monotone_score"))
    if monotone is not None and monotone >= 60:
        return (
            "Your pitch barely moved through that. When every word gets the same "
            "note, nothing sounds important, so the room stops picking out your point."
        )
    if confidence is not None and confidence < 52:
        return (
            f"Certainty came out around {int(round(confidence))} out of a hundred — an estimate, "
            "but it's the sound of sentences trailing off before they finish."
        )
    return ""


def _headline_note(
    metrics: dict[str, Any], events: list[dict[str, Any]]
) -> tuple[str, str]:
    """The one measured thing worth saying out loud, and its line id.

    All three notes are true, and saying all three is what turns coaching into a
    read-out: six sentences of numbers before the listener reaches anything they
    can act on. A person picks the thing that was most wrong and says that. The
    rest is on screen, where it can be re-read without anyone waiting for it.
    """
    wpm = _num(metrics.get("wpm"))
    pace = _pace_note(wpm)
    fillers = _filler_note(events, metrics)
    certainty = _certainty_note(metrics)

    # Ordered by what a listener in the room would actually have noticed first.
    badly_paced = wpm is not None and (wpm > 168 or wpm < 105)
    if badly_paced and pace:
        return "pace", pace
    if fillers:
        return "fillers", fillers
    if certainty:
        return "certainty", certainty
    if pace:
        return "pace", pace
    return "", ""


# ---------------------------------------------------------------- the loop
#
# A coach does not read you your own measurements. It says the one thing it
# noticed, checks whether you felt it too, tells you the single change to make,
# and then makes you do it again. The numbers are not hidden - they are on the
# screen, where they can be looked at rather than waited through.


def _where(start: Any, duration: Any) -> str:
    """Where in the take it happened, placed the way a person places it."""
    begin = _num(start)
    length = _num(duration)
    if begin is None or not length or length <= 0:
        return ""
    fraction = begin / length
    if fraction <= 0.28:
        return "early on"
    if fraction <= 0.62:
        return "about halfway through"
    return "when you got towards the end"


class Observation:
    """One thing worth saying, in the four shapes the conversation needs."""

    def __init__(
        self,
        key: str,
        frame: str,
        probe: str,
        confirm_yes: str,
        confirm_no: str,
        correction: str,
        retry: str,
    ) -> None:
        self.key = key
        self.frame = frame
        self.probe = probe
        self.confirm_yes = confirm_yes
        self.confirm_no = confirm_no
        self.correction = correction
        self.retry = retry


def _observe(
    metrics: dict[str, Any], events: list[dict[str, Any]], duration: Any
) -> Observation | None:
    """The single thing the coach works on this round.

    Chosen from the measurements, phrased without any of them. "You sped up
    when you got to the numbers" is something you can hear yourself doing;
    "your pace was a hundred and seventy-eight words a minute" is a fact you
    have to be told, and being told facts about yourself is not coaching.
    """
    wpm = _num(metrics.get("wpm"))
    fastest = metrics.get("fastest_section") or {}
    fast_wpm = _num(fastest.get("wpm"))
    monotone = _num(metrics.get("monotone_score"))
    confidence = _num(metrics.get("confidence_est"))

    filler_counts: Counter[str] = Counter()
    for event in events:
        if str(event.get("kind") or "") == "filler":
            phrase = str((event.get("meta") or {}).get("phrase") or "").strip()
            if phrase:
                filler_counts[phrase] += 1
    fillers = int(_num(metrics.get("filler_count"), 0) or 0) or sum(filler_counts.values())

    # A burst inside an otherwise steady take is the most useful note there is:
    # it is specific, it has a place in the recording, and it is fixable in one
    # attempt. It beats an average, which describes no moment in particular.
    if wpm and fast_wpm and fast_wpm - wpm >= 22:
        place = _where(fastest.get("start"), duration)
        at = f" {place}" if place else ""
        return Observation(
            key="surge",
            frame="You were fairly measured for most of that.",
            probe=f"Did you feel yourself speeding up{at}?",
            confirm_yes="Exactly. That's what I heard too.",
            confirm_no="It's subtle from the inside. But it's there.",
            correction="Take a breath before the part that matters, and let the number land on its own.",
            retry="Give me that part again.",
        )

    if fillers >= 3:
        word = filler_counts.most_common(1)[0][0] if filler_counts else "um"
        return Observation(
            key="filler",
            frame="The shape of it was fine.",
            probe=f"Did you catch how often you were saying \"{word}\"?",
            confirm_yes="Right. And every one of them sits where you weren't sure yet.",
            confirm_no="They go past you when you're speaking. They don't when you're listening.",
            correction="When you feel one coming, just stop instead. The silence does the same job and sounds certain.",
            retry="Try the opening again, and let yourself pause.",
        )

    if monotone is not None and monotone >= 60:
        return Observation(
            key="flat",
            frame="You were clear the whole way through.",
            probe="Did that feel a bit flat to you?",
            confirm_yes="That's it. Every word got the same weight, so nothing stood out.",
            confirm_no="It reads flatter from out here than it feels in your head.",
            correction="Pick the one sentence you'd want them to repeat afterwards, and drop your voice on it.",
            retry="Say me that one sentence.",
        )

    if confidence is not None and confidence < 52:
        return Observation(
            key="trail",
            frame="The content is there, and it holds up.",
            probe="Did you notice your sentences trailing off at the end?",
            confirm_yes="Yes. And that's the bit a room remembers.",
            confirm_no="It's the last two words each time. They drop away.",
            correction="Finish the sentence down and stop. Don't let it drift up like a question.",
            retry="Give me your last line again, and land it.",
        )

    if wpm is not None and wpm < 105:
        return Observation(
            key="slow",
            frame="Every word of that was clear.",
            probe="Did it feel a little careful to you?",
            confirm_yes="That's the one. Careful reads as unsure, even when you're right.",
            confirm_no="It's measured. A shade more push and it becomes certain instead.",
            correction="Take the first two sentences a little quicker, like you already know they work.",
            retry="Run the opening again, with a bit more front foot.",
        )

    return None


CLOSERS = {
    "investor": "Run it again before you're in a room with anyone holding a chequebook.",
    "class": "Run it again before you're standing in front of the class.",
    "job": "Run it again before the day. Same script, one thing changed.",
}


def build_script(
    session: dict[str, Any] | None,
    metrics: dict[str, Any] | None,
    events: list[dict[str, Any]] | None,
    lab_recs: list[dict[str, Any]] | None,
    *,
    seconds: int | None = None,
    purpose: str = "",
) -> list[dict[str, Any]]:
    """The spoken review, as ordered lines the player speaks one at a time."""
    from .founder_verdict import founder_voice_score

    m = dict(metrics or {})
    sess = dict(session or {})
    raw = list(events or [])
    score = founder_voice_score(m)
    lines: list[dict[str, Any]] = []

    spoken_for = seconds or int(_num(sess.get("duration"), 0) or 0)
    opener = "Okay. Here's what I heard."
    if spoken_for:
        opener = f"Okay, {spoken_for} seconds. Here's what I heard."
    lines.append(_line("open", "open", opener))
    lines.append(_line("verdict", "verdict", _verdict(score), score=score))

    note_id, note = _headline_note(m, raw)
    if note:
        lines.append(_line(note_id, "read", note))
    # Kept for the de-duplication below: if fillers were the thing said out
    # loud, ranking them again as a finding is the coach saying one thing twice.
    fillers = note if note_id == "fillers" else ""
    certainty = _certainty_note(m)

    # Fillers were just named word by word; repeating them as a ranked finding
    # is the coach saying the same thing twice in different clothes.
    ranked = _group(
        [
            e
            for e in raw
            if (e.get("label") or e.get("observation"))
            and not (fillers and str(e.get("kind") or "") == "filler")
        ]
    )

    hedged = False
    for idx, event in enumerate(ranked[:MAX_ISSUES], start=1):
        headline = str(event.get("observation") or event.get("label") or "").strip()
        # The analyser marks its softer findings "(estimate)". tts.speakable
        # takes the parenthesis out of the sentence; the honesty is owed back,
        # once, in words a person would actually use.
        hedged = hedged or bool(re.search(r"\(estimat", headline, re.I))
        cause = str(event.get("cause") or "").strip()
        fix = str(event.get("fix") or "").strip()
        lead = "The main thing" if idx == 1 else "The other one"
        times = int(event.get("_count") or 1)
        if headline:
            said = f"{lead}: {_clause(headline)}."
            if times > 1:
                said += f" That happened {times} times in one take."
            lines.append(_line(f"issue-{idx}", "issue", said, severity=_num(event.get("severity"), 0.5)))
        if cause:
            lines.append(
                _line(f"cause-{idx}", "cause", f"That's not your voice, that's a habit. {_sentence(cause)}")
            )
        if fix:
            spoken_fix = f"So next take, {fix[0].lower()}{fix[1:]}"
            lines.append(_line(f"fix-{idx}", "fix", _sentence(spoken_fix)))

    if hedged:
        lines.append(
            _line(
                "hedge",
                "aside",
                "That last one is my read rather than a measurement, so take it as a direction.",
            )
        )

    if not ranked and not fillers and not certainty:
        lines.append(
            _line(
                "issue-none",
                "issue",
                "Nothing in there broke. That means the next gain is range, not repair.",
            )
        )

    lab = (lab_recs or [None])[0]
    if lab:
        title = str(lab.get("title") or "").strip()
        sound = str(lab.get("sound") or "").strip()
        fix_line = str(lab.get("fix_line") or "").strip()
        if sound:
            lines.append(_line("lab-why", "lab", sound, lab_key=lab.get("key")))
        lines.append(
            _line(
                "lab",
                "lab",
                fix_line or f"Go do the {title} lab. Two minutes, then pitch me again.",
                lab_key=lab.get("key"),
                lab_title=title,
            )
        )

    lines.append(
        _line(
            "close",
            "close",
            CLOSERS.get(purpose)
            or "Then run it again. Same script, one thing changed. That's how this moves.",
        )
    )
    return [ln for ln in lines if ln["text"]]


def build_conversation(
    session: dict[str, Any] | None,
    metrics: dict[str, Any] | None,
    events: list[dict[str, Any]] | None,
    *,
    purpose: str = "",
) -> dict[str, Any]:
    """The spoken half of a coaching round, as a conversation rather than a read-out.

    The written report keeps every number. This keeps none of them: it opens,
    says the one thing it noticed, asks whether you felt it too, gives a single
    correction and sends you back in. What comes back is not a flat list of
    lines but the parts of an exchange, because the client has to stop and
    listen in the middle of it.
    """
    from .founder_verdict import founder_voice_score

    m = dict(metrics or {})
    sess = dict(session or {})
    raw = list(events or [])
    duration = _num(sess.get("duration"))
    observation = _observe(m, raw, duration)

    opening = [
        _line("open", "open", "Okay. I heard it."),
        _line("verdict", "verdict", _verdict(founder_voice_score(m))),
    ]

    if not observation:
        # Nothing measurable went wrong. Saying so plainly and moving to the
        # harder part is more use than inventing a fault to have something to
        # coach, which is what a scorecard does when it has nothing to report.
        opening.append(
            _line("clean", "read", "Nothing in the delivery got in the way that time.")
        )
        return {
            "lines": opening,
            "probe": None,
            "correction": None,
            "retry": None,
            "close": CLOSERS.get(purpose)
            or "Then run it again. Same script, one thing changed.",
        }

    opening.append(_line("frame", "read", observation.frame))
    opening.append(_line("turn", "aside", "But there's something I noticed."))

    return {
        "lines": opening,
        "key": observation.key,
        "probe": {
            "text": tts.speakable(observation.probe),
            "yes": tts.speakable(observation.confirm_yes),
            "no": tts.speakable(observation.confirm_no),
        },
        "correction": tts.speakable(observation.correction),
        "retry": tts.speakable(observation.retry),
        "close": CLOSERS.get(purpose)
        or "Then run it again. Same script, one thing changed.",
    }


# What a second attempt gets told. Never a comparison of two numbers: the
# listener does not need "a hundred and seventy-two down to a hundred and
# forty-eight", they need to know whether it worked.
def build_retry_reaction(
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
    key: str = "",
) -> list[dict[str, Any]]:
    """How the coach reacts to the retake, in the words a person would use."""
    b = dict(before or {})
    a = dict(after or {})

    def moved(field: str, better_when_lower: bool = True) -> float | None:
        was, now = _num(b.get(field)), _num(a.get(field))
        if was is None or now is None:
            return None
        delta = was - now
        return delta if better_when_lower else -delta

    gain: float | None = None
    if key == "surge":
        was, now = _num(b.get("pace_variation")), _num(a.get("pace_variation"))
        gain = (was - now) if was is not None and now is not None else None
    elif key == "filler":
        gain = moved("filler_count")
    elif key == "flat":
        gain = moved("monotone_score")
    elif key == "trail":
        gain = moved("confidence_est", better_when_lower=False)
    elif key == "slow":
        was, now = _num(b.get("wpm")), _num(a.get("wpm"))
        gain = (now - was) if was is not None and now is not None else None

    if gain is None:
        return [
            _line("react", "verdict", "Yeah."),
            _line("react-2", "read", "That sat better. Keep that version."),
        ]
    if gain > 0.5:
        return [
            _line("react", "verdict", "Yeah."),
            _line("react-2", "read", "That's much easier to listen to."),
        ]
    if gain > -0.5:
        return [
            _line("react", "verdict", "Close."),
            _line("react-2", "read", "Same as before, near enough. It's worth one more go."),
        ]
    return [
        _line("react", "verdict", "Hm."),
        _line(
            "react-2",
            "read",
            "That one went the other way. Slow the whole thing down and try it once more.",
        ),
    ]


async def humanize(lines: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Let DeepSeek rewrite the templates into speech, without changing them.

    Any drift in shape - wrong length, non-JSON, an empty line - and the
    templates are kept as-is. A rewrite that loses a finding is worse than a
    stiff line that keeps it.
    """
    from .deepseek import deepseek_chat

    if not lines:
        return lines
    payload = json.dumps([ln["text"] for ln in lines], ensure_ascii=False)
    raw = await deepseek_chat(
        [
            {"role": "system", "content": SYSTEM_SPEAK},
            {"role": "user", "content": payload},
        ],
        temperature=0.6,
        max_tokens=900,
    )
    if not raw:
        return lines
    cleaned = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
    try:
        rewritten = json.loads(cleaned)
    except ValueError:
        logger.debug("Spoken rewrite was not JSON, keeping the templates.")
        return lines
    if not isinstance(rewritten, list) or len(rewritten) != len(lines):
        return lines
    out: list[dict[str, Any]] = []
    for original, replacement in zip(lines, rewritten):
        text = tts.speakable(replacement if isinstance(replacement, str) else "")
        out.append({**original, "text": text or original["text"]})
    return out
