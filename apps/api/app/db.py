import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from .config import get_settings


SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    title TEXT,
    mode TEXT NOT NULL DEFAULT 'free',
    duration REAL DEFAULT 0,
    audio_path TEXT,
    transcript_json TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    coach_summary TEXT,
    error TEXT,
    listening_session_id TEXT,
    conversation_index INTEGER,
    exercise_key TEXT,
    focus_json TEXT
);

CREATE TABLE IF NOT EXISTS metrics (
    session_id TEXT PRIMARY KEY,
    wpm REAL,
    articulation_rate REAL,
    effective_speaking_rate REAL,
    pace_variation REAL,
    fastest_section_start REAL,
    fastest_section_end REAL,
    slowest_section_start REAL,
    slowest_section_end REAL,
    filler_count INTEGER,
    filler_rate REAL,
    avg_pause_duration REAL,
    longest_pause REAL,
    pause_quality REAL,
    clarity REAL,
    pitch_mean REAL,
    pitch_stability REAL,
    pitch_variation REAL,
    loudness_mean REAL,
    volume_consistency REAL,
    energy REAL,
    confidence_est REAL,
    stress_est REAL,
    monotone_score REAL,
    breath_frequency REAL,
    vocabulary_diversity REAL,
    avg_sentence_length REAL,
    grammar_score REAL,
    readability REAL,
    hook_strength REAL,
    problem_clarity REAL,
    solution_clarity REAL,
    moat_clarity REAL,
    traction_clarity REAL,
    closing_effectiveness REAL,
    cta_score REAL,
    ceo_presence REAL,
    founder_trust REAL,
    fundraising_readiness REAL,
    demo_day_readiness REAL,
    yc_readiness REAL,
    executive_presence REAL,
    investor_would_invest TEXT,
    payload_json TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    start REAL,
    end REAL,
    severity REAL DEFAULT 0.5,
    label TEXT,
    cause TEXT,
    fix TEXT,
    exercise TEXT,
    meta_json TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    frequency INTEGER DEFAULT 0,
    trend REAL DEFAULT 0,
    last_seen TEXT,
    evidence_json TEXT
);

CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    duration_sec INTEGER DEFAULT 120,
    target_pattern TEXT,
    level INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS exercise_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_key TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS practice_turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    scores_json TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listening_sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    ended_at TEXT,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    settings_json TEXT,
    summary_json TEXT,
    conversation_count INTEGER DEFAULT 0,
    speaking_time_sec REAL DEFAULT 0,
    device_label TEXT
);

CREATE TABLE IF NOT EXISTS voice_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    scores_json TEXT NOT NULL,
    baseline_json TEXT,
    history_json TEXT,
    hard_words_json TEXT,
    updated_at TEXT NOT NULL,
    sessions_counted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS voice_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    goal_key TEXT NOT NULL DEFAULT 'executive_presence',
    goal_label TEXT NOT NULL DEFAULT 'Executive Presence',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weakness_key TEXT NOT NULL,
    title TEXT NOT NULL,
    why TEXT,
    exercise_key TEXT,
    priority INTEGER DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'active',
    expected_gain_json TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE(weakness_key)
);

CREATE TABLE IF NOT EXISTS daily_missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_date TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    focus_key TEXT,
    exercise_key TEXT,
    why TEXT,
    completed INTEGER DEFAULT 0,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS custom_fillers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phrase TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);
CREATE INDEX IF NOT EXISTS idx_completions_at ON exercise_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_listening_created ON listening_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_missions_date ON daily_missions(mission_date);
"""


def _migrate(conn: sqlite3.Connection) -> None:
    """Add columns introduced after Phase 0 without breaking existing DBs."""
    cols = {r[1] for r in conn.execute("PRAGMA table_info(sessions)").fetchall()}
    if "listening_session_id" not in cols:
        conn.execute("ALTER TABLE sessions ADD COLUMN listening_session_id TEXT")
    if "conversation_index" not in cols:
        conn.execute("ALTER TABLE sessions ADD COLUMN conversation_index INTEGER")
    if "exercise_key" not in cols:
        conn.execute("ALTER TABLE sessions ADD COLUMN exercise_key TEXT")
    if "focus_json" not in cols:
        conn.execute("ALTER TABLE sessions ADD COLUMN focus_json TEXT")
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sessions_listening ON sessions(listening_session_id)"
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_mode ON sessions(mode)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_exercise ON sessions(exercise_key)")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS custom_fillers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phrase TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    ex_cols = {r[1] for r in conn.execute("PRAGMA table_info(exercises)").fetchall()}
    if "level" not in ex_cols:
        conn.execute("ALTER TABLE exercises ADD COLUMN level INTEGER DEFAULT 1")

SEED_EXERCISES = [
    ("breath_box", "Box Breathing", "breathing", "Inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 6 cycles. Speak one sentence after each cycle.", 120, "speaking_on_empty_breath"),
    ("breath_diaphragm", "Diaphragm Support", "breathing", "Hand on belly. Inhale 3s expanding belly, speak one claim on the exhale without shoulder lift.", 150, "speaking_on_empty_breath"),
    ("articulation_twisters", "Tongue Twisters", "articulation", "Repeat: 'Red leather, yellow leather' then 'Unique New York' slowly, then at pitch pace.", 180, "mumbling"),
    ("consonant_finish", "Finish Every Consonant", "articulation", "Read 8 product sentences. Over-finish final consonants (t/d/k/s). Record and check endings.", 180, "drop_technical_endings"),
    ("pause_drill_3", "Pause Drill #3", "pause", "Read a paragraph; insert a 0.7s pause after every hook or claim.", 120, "rush_on_intro"),
    ("strategic_pause", "Strategic Pause", "pause", "Explain one technical idea. Pause 1 full second before the key term and after the claim.", 150, "missing_pauses"),
    ("pitch_variation", "Pitch Variation Ladder", "pitch", "Say one sentence five times: flat, rising, falling, emphatic, calm CEO — stay authentic.", 150, "monotone"),
    ("emphasis_keywords", "Keyword Emphasis", "pitch", "Mark 5 keywords in a short pitch. Raise pitch slightly only on those words.", 120, "monotone"),
    ("executive_open", "Executive Opening", "executive", "Deliver a 30s intro at 130–140 WPM with one planned breath.", 180, "rush_on_intro"),
    ("executive_presence", "Calm Authority", "executive", "Speak your ask twice: first rushed, second 10% slower with finished endings and a final pause.", 180, "confidence_drop_qa"),
    ("filler_fast", "Filler Fast", "filler", "Speak for 60s on your product. Clap once each time you catch a filler; replace with silence.", 90, "filler_overuse"),
    ("story_arc", "Story Arc Retell", "storytelling", "Retell problem → solution → traction in 90s with clear transitions and one pause each.", 120, "weak_transitions"),
    ("confidence_stance", "Confidence Stance", "confidence", "Stand, feet planted, speak your ask twice—second time 10% slower.", 120, "confidence_drop_qa"),
    ("pronunciation_tech", "Tech Word Clarity", "pronunciation", "List 8 product terms; over-articulate endings at slow → normal → presentation speed.", 180, "drop_technical_endings"),
    ("hard_word_ladder", "Hard Word Ladder", "pronunciation", "Practice your unclear words: slow, normal, then presentation speed. Finish every syllable.", 150, "drop_technical_endings"),
    ("warmup_hum", "Hum Warmup", "resonance", "Hum descending scales 60s (feel vibration in face/chest), then read aloud 60s.", 120, "low_resonance"),
    ("lip_trills", "Lip Trills", "resonance", "Lip trill on a comfortable pitch for 45s, then speak 3 sentences with the same ease.", 120, "low_resonance"),
    ("chest_resonance", "Chest Resonance", "resonance", "Hum on 'mmm' into chest, then open to 'ah' while keeping vibration. Speak one paragraph.", 150, "low_resonance"),
    ("projection_support", "Breath-Supported Projection", "projection", "Speak to the far wall using breath support — never shout. Same volume at start and end of sentences.", 150, "weak_projection"),
    ("open_vowels", "Open Vowel Practice", "projection", "Read sentences exaggerating open vowels (ah/oh/ay), then normalize while keeping space.", 120, "weak_projection"),
    ("tech_explain", "Technical Explanation", "executive", "Explain a technical concept to a non-expert in 90s at 130 WPM with finished word endings.", 120, "drop_technical_endings"),
    ("investor_ask", "Investor Ask Practice", "executive", "Deliver your ask in 45s: calm, clear, one pause before the number, finished consonants.", 90, "rush_on_intro"),
    ("one_liner", "45s One-Liner", "executive", "Company in one breath. Pause after the hook. 130 WPM.", 60, "rush_on_intro"),
    ("hard_question", "Hard Question Hold", "confidence", "Answer a tough question. Exhale. Pause 1s. Lead with the headline.", 90, "confidence_drop_qa"),
    ("board_update", "Board Update", "storytelling", "What shipped, what slipped, what's next — 90s with one pause per beat.", 90, "weak_transitions"),
]

# Level 1 = warm / easy  ·  2 = control  ·  3 = under pressure
EXERCISE_LEVELS: dict[str, int] = {
    "breath_box": 1,
    "warmup_hum": 1,
    "lip_trills": 1,
    "filler_fast": 1,
    "pause_drill_3": 1,
    "confidence_stance": 1,
    "one_liner": 1,
    "breath_diaphragm": 2,
    "consonant_finish": 2,
    "strategic_pause": 2,
    "pitch_variation": 2,
    "emphasis_keywords": 2,
    "chest_resonance": 2,
    "open_vowels": 2,
    "hard_word_ladder": 2,
    "articulation_twisters": 2,
    "board_update": 2,
    "executive_open": 3,
    "executive_presence": 3,
    "story_arc": 3,
    "tech_explain": 3,
    "investor_ask": 3,
    "projection_support": 3,
    "pronunciation_tech": 3,
    "hard_question": 3,
}


# Tables that must survive a visitor clearing their cookie. Quota counters are
# keyed by network address: if they lived in the per-workspace database, a new
# cookie would mean a new allowance and the limit would be decorative.
SHARED_SCHEMA = """
CREATE TABLE IF NOT EXISTS contact_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    message TEXT,
    interest TEXT
);

CREATE TABLE IF NOT EXISTS usage_quota (
    bucket TEXT NOT NULL,
    feature TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    window_started TEXT,
    PRIMARY KEY (bucket, feature)
);
"""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _migrate_shared(conn: sqlite3.Connection) -> None:
    """Bring an older shared database up to date."""
    cols = {r[1] for r in conn.execute("PRAGMA table_info(usage_quota)").fetchall()}
    if cols and "window_started" not in cols:
        conn.execute("ALTER TABLE usage_quota ADD COLUMN window_started TEXT")
        # Existing rows have no window; treat first_seen as its start so nobody
        # is stuck at their old lifetime total.
        conn.execute(
            "UPDATE usage_quota SET window_started = first_seen WHERE window_started IS NULL"
        )


def init_shared_db() -> None:
    settings = get_settings()
    settings.data_root.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.shared_db_path, check_same_thread=False)
    try:
        conn.executescript(SHARED_SCHEMA)
        _migrate_shared(conn)
        conn.commit()
    finally:
        conn.close()


@contextmanager
def connect_shared() -> Iterator[sqlite3.Connection]:
    """The database that is the same for everyone: quota counters and leads."""
    settings = get_settings()
    conn = sqlite3.connect(settings.shared_db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    """Create the current workspace's database and directories."""
    settings = get_settings()
    settings.data_path.mkdir(parents=True, exist_ok=True)
    settings.audio_dir.mkdir(parents=True, exist_ok=True)
    settings.transcripts_dir.mkdir(parents=True, exist_ok=True)
    settings.reports_dir.mkdir(parents=True, exist_ok=True)
    settings.models_dir.mkdir(parents=True, exist_ok=True)

    with _open(settings.db_path) as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)
        for row in SEED_EXERCISES:
            conn.execute(
                """
                INSERT OR IGNORE INTO exercises (key, title, category, description, duration_sec, target_pattern)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                row,
            )
        for key, level in EXERCISE_LEVELS.items():
            conn.execute("UPDATE exercises SET level=? WHERE key=?", (level, key))
        conn.execute("UPDATE exercises SET level=1 WHERE level IS NULL OR level < 1")
        conn.commit()


@contextmanager
def _open(path: Any) -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()


# Creating a workspace's schema is idempotent but not free, so remember which
# ones this process has already prepared.
_READY: set[str] = set()


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """The current visitor's database.

    Which file this opens depends on the workspace in context, which is what
    isolates one visitor from another. A query that forgets to filter still
    cannot reach another visitor's rows, because they are in a different file.
    """
    settings = get_settings()
    path = settings.db_path
    key = str(path)
    if key not in _READY:
        # First request for this workspace in this process: build it.
        init_db()
        _READY.add(key)
    with _open(path) as conn:
        yield conn


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {k: row[k] for k in row.keys()}


def dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False)


def loads(text: str | None, default: Any = None) -> Any:
    if not text:
        return default
    return json.loads(text)
