"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Render coach summaries that may contain markdown (**bold**, # headings, lists). */
export function CoachSummary({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const cleaned = stripFences(text || "").trim();
  if (!cleaned) {
    return <p className="text-sm text-[var(--muted)]">Waiting for analysis…</p>;
  }

  const blocks = splitBlocks(cleaned);

  return (
    <div className={cn("space-y-3 text-sm leading-relaxed text-[var(--ink)]", className)}>
      {blocks.map((block, i) => {
        if (block.type === "h1") {
          return (
            <h4 key={i} className="font-[family-name:var(--font-display)] text-lg text-[var(--accent)]">
              {inline(block.text)}
            </h4>
          );
        }
        if (block.type === "h2") {
          return (
            <h4 key={i} className="pt-1 font-[family-name:var(--font-display)] text-base text-[var(--accent)]">
              {inline(block.text)}
            </h4>
          );
        }
        if (block.type === "h3") {
          return (
            <h5 key={i} className="font-semibold text-[var(--ink)]">
              {inline(block.text)}
            </h5>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 text-[var(--ink)]">
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5 text-[var(--ink)]">
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ol>
          );
        }
        // Explicit check: narrowing the union by elimination left TS unable to
        // prove the remaining member carries `text`.
        if (block.type === "p") {
          return (
            <p key={i} className="text-[var(--ink)]">
              {inline(block.text)}
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}

function stripFences(text: string): string {
  return text
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/\r\n/g, "\n");
}

type Block =
  | { type: "h1" | "h2" | "h3" | "p"; text: string }
  | { type: "ul" | "ol"; items: string[] };

function splitBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const out: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      const level = trimmed.match(/^#+/)![0].length;
      const content = trimmed.replace(/^#{1,3}\s+/, "");
      out.push({
        type: level === 1 ? "h1" : level === 2 ? "h2" : "h3",
        text: content,
      });
      i += 1;
      continue;
    }

    // Bold-only section labels like **Observation** or **Root Cause:**
    if (/^\*\*[^*]+\*\*:?\s*$/.test(trimmed) || /^\*\*[^*]+\*\*\s*$/.test(trimmed)) {
      out.push({ type: "h3", text: trimmed.replace(/\*\*/g, "").replace(/:$/, "") });
      i += 1;
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i += 1;
      }
      out.push({ type: "ul", items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ""));
        i += 1;
      }
      out.push({ type: "ol", items });
      continue;
    }

    // Labeled lines: Observation: … / Root Cause: …
    const labelMatch = trimmed.match(
      /^(Observation|Root Cause|Cause|Evidence|Impact|Specific Exercise|Exercise|Expected Improvement|Daily habit|Voice Memory|Profile trend)\s*[:—-]\s*(.*)$/i,
    );
    if (labelMatch) {
      const rest = labelMatch[2]?.trim();
      out.push({ type: "h3", text: labelMatch[1] });
      if (rest) out.push({ type: "p", text: rest });
      i += 1;
      continue;
    }

    const para: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        !next ||
        /^#{1,3}\s+/.test(next) ||
        /^[-*•]\s+/.test(next) ||
        /^\d+[.)]\s+/.test(next) ||
        /^\*\*[^*]+\*\*:?\s*$/.test(next)
      ) {
        break;
      }
      para.push(next);
      i += 1;
    }
    out.push({ type: "p", text: para.join(" ") });
  }

  return out;
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // **bold**, *italic*, `code`
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-[var(--ink)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      nodes.push(
        <code key={key++} className="rounded bg-[var(--bg)] px-1 font-mono text-xs">
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
