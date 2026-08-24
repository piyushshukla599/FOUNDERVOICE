import Link from "next/link";
import type { Section } from "@/lib/guides";

/**
 * Rendering for guide prose, and the two extractable blocks a guide section
 * can carry.
 *
 * Everything here exists because of one problem: seventeen guides of unbroken
 * paragraphs. Prose ranks, but prose does not get lifted. Featured snippets,
 * People Also Ask and AI Overview citations are all extractions, and what gets
 * extracted is a list, a table row or a short direct answer. A page can be the
 * best answer on the web and still lose every position that gets clicked,
 * because there was nothing on it shaped like an answer.
 */

/**
 * Inline links inside a paragraph, written as `[anchor](/guides/slug)`.
 *
 * Guides used to link to each other only from the "Related guides" rail at the
 * foot of the page - three links, all with the same generic surrounding text.
 * That is the weakest form of internal link there is: no anchor context, no
 * position in the body, and equal weight to every other link on the page. A
 * link inside the sentence that raises the topic carries the anchor text, the
 * surrounding context and the position, which is most of what an internal link
 * is worth.
 *
 * The parser is deliberately tiny. This is authored content in a typed file,
 * not user input, and `validateGuideLinks` in lib/guides.ts fails the build if
 * a slug in one of these does not resolve - so a link cannot rot into a 404
 * without someone noticing at build time.
 */
const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

export function RichText({ children }: { children: string }) {
  LINK.lastIndex = 0;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = LINK.exec(children)) !== null) {
    if (m.index > last) out.push(children.slice(last, m.index));
    out.push(
      <Link key={`${m.index}-${m[2]}`} href={m[2]} className="fv-quiet-link underline">
        {m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < children.length) out.push(children.slice(last));
  return <>{out}</>;
}

/**
 * A steps list or a criteria list.
 *
 * Ordered renders as a real `<ol>` rather than paragraphs starting "Step 1",
 * because the list element is what marks the sequence as a sequence to
 * anything parsing the page. The leading clause of each item is bolded on the
 * assumption it is the label - that is how these are written, and it is what
 * makes the list scannable at a glance and quotable in a snippet.
 */
function ListBlock({ list }: { list: NonNullable<Section["list"]> }) {
  const Tag = list.ordered ? "ol" : "ul";
  return (
    <div className="mt-5">
      {list.intro && (
        <p className="mt-3.5 text-[15px] leading-relaxed text-[var(--muted)]">
          <RichText>{list.intro}</RichText>
        </p>
      )}
      <Tag
        className={`mt-4 space-y-3 border-l border-[var(--line)] pl-5 ${
          list.ordered ? "list-decimal" : "list-disc"
        } marker:text-[var(--faint)] marker:text-[13px]`}
      >
        {list.items.map((item) => (
          <li
            key={item.slice(0, 48)}
            className="pl-1 text-[15px] leading-relaxed text-[var(--muted)]"
          >
            <RichText>{item}</RichText>
          </li>
        ))}
      </Tag>
    </div>
  );
}

/**
 * A data table.
 *
 * Wrapped in its own `overflow-x-auto` container so a four-column table cannot
 * make the whole page scroll sideways on a phone - which is a Core Web Vitals
 * and a usability problem long before it is an SEO one.
 *
 * The `<caption>` is not decoration. It is the one place the table says what it
 * is about in words, and it is what an extraction quotes the table under.
 */
function TableBlock({ table }: { table: NonNullable<Section["table"]> }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left">
        <caption className="mb-3 text-left text-[13px] leading-snug text-[var(--faint)]">
          {table.caption}
        </caption>
        <thead>
          <tr className="border-b border-[var(--line-strong)]">
            {table.head.map((h) => (
              <th
                key={h}
                scope="col"
                className="fv-num py-2.5 pr-4 text-[11.5px] font-medium tracking-wide text-[var(--ink-dim)] uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row[0]} className="border-b border-[var(--line)] align-top">
              {row.map((cell, i) => (
                <td
                  key={`${row[0]}-${i}`}
                  className={
                    i === 0
                      ? "fv-num py-3 pr-4 text-[13.5px] leading-relaxed whitespace-nowrap text-[var(--ink-dim)]"
                      : "py-3 pr-4 text-[14px] leading-relaxed text-[var(--muted)]"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GuideSection({ section, id }: { section: Section; id: string }) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <h2 className="text-[21px] leading-snug text-balance text-[var(--ink)]">{section.h}</h2>
      {section.p.map((para) => (
        <p
          key={para.slice(0, 40)}
          className="mt-3.5 text-[15px] leading-relaxed text-[var(--muted)]"
        >
          <RichText>{para}</RichText>
        </p>
      ))}
      {section.list && <ListBlock list={section.list} />}
      {section.table && <TableBlock table={section.table} />}
    </section>
  );
}
