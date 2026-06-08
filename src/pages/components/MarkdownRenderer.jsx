import { Fragment, useMemo } from "react";
import { cx } from "./ui";

/**
 * Small Markdown renderer for AI responses without adding another dependency.
 */
function MarkdownRenderer({ content, className = "" }) {
  const source = String(content || "").trim();
  const blocks = useMemo(() => parseBlocks(source), [source]);

  if (!source) return null;

  return (
    <div className={cx("space-y-4 text-sm leading-7 text-slate-700 dark:text-slate-200", className)}>
      {blocks}
    </div>
  );
}

function parseBlocks(source, keyPrefix = "md") {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```(\S*)?\s*$/);
    if (fence) {
      const language = fence[1] || "";
      const codeLines = [];
      index += 1;

      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) index += 1;
      blocks.push(renderCodeBlock(codeLines.join("\n"), language, `${keyPrefix}-code-${blocks.length}`));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push(renderHeading(heading[1].length, heading[2], `${keyPrefix}-heading-${blocks.length}`));
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableLines = [lines[index], lines[index + 1]];
      index += 2;

      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }

      blocks.push(renderTable(tableLines, `${keyPrefix}-table-${blocks.length}`));
      continue;
    }

    if (isBlockquoteLine(line)) {
      const quoteLines = [];

      while (index < lines.length && isBlockquoteLine(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }

      blocks.push(
        <blockquote
          key={`${keyPrefix}-quote-${blocks.length}`}
          className="rounded-lg border-l-4 border-violet-300 bg-violet-50/70 px-4 py-3 text-slate-700 dark:border-violet-400/60 dark:bg-violet-500/10 dark:text-slate-200"
        >
          <div className="space-y-3">
            {parseBlocks(quoteLines.join("\n"), `${keyPrefix}-quote-${blocks.length}`)}
          </div>
        </blockquote>,
      );
      continue;
    }

    if (isUnorderedListLine(line)) {
      const items = [];

      while (index < lines.length && isUnorderedListLine(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*+]\s+/, ""));
        index += 1;
      }

      blocks.push(renderList("ul", items, `${keyPrefix}-ul-${blocks.length}`));
      continue;
    }

    if (isOrderedListLine(line)) {
      const items = [];

      while (index < lines.length && isOrderedListLine(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ""));
        index += 1;
      }

      blocks.push(renderList("ol", items, `${keyPrefix}-ol-${blocks.length}`));
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;

    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    blocks.push(
      <p key={`${keyPrefix}-p-${blocks.length}`} className="safe-text">
        {parseInline(paragraph.join(" "), `${keyPrefix}-p-${blocks.length}`)}
      </p>,
    );
  }

  return blocks;
}

function renderHeading(level, text, key) {
  const Tag = `h${level}`;
  const classes = {
    1: "safe-text text-2xl font-black leading-tight text-slate-950 dark:text-white",
    2: "safe-text text-xl font-black leading-tight text-slate-950 dark:text-white",
    3: "safe-text text-lg font-bold leading-tight text-slate-950 dark:text-white",
    4: "safe-text text-base font-bold leading-tight text-slate-900 dark:text-slate-100",
    5: "safe-text text-sm font-bold uppercase text-slate-700 dark:text-slate-200",
    6: "safe-text text-xs font-bold uppercase text-slate-600 dark:text-slate-300",
  };

  return (
    <Tag key={key} className={classes[level]}>
      {parseInline(text.trim(), key)}
    </Tag>
  );
}

function renderCodeBlock(code, language, key) {
  return (
    <div key={key} className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-inner">
      {language && (
        <div className="border-b border-slate-800 px-4 py-2 text-xs font-bold uppercase text-slate-400">
          {language}
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-sm leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderList(type, items, key) {
  const Tag = type;

  return (
    <Tag
      key={key}
      className={cx(
        "space-y-2 pl-6",
        type === "ol" ? "list-decimal" : "list-disc",
      )}
    >
      {items.map((item, index) => (
        <li key={`${key}-item-${index}`} className="safe-text pl-1">
          {parseInline(item, `${key}-item-${index}`)}
        </li>
      ))}
    </Tag>
  );
}

function renderTable(tableLines, key) {
  const headers = splitTableRow(tableLines[0]);
  const rows = tableLines.slice(2).map(splitTableRow);

  return (
    <div key={key} className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            {headers.map((header, index) => (
              <th
                key={`${key}-header-${index}`}
                scope="col"
                className="px-4 py-3 font-black text-slate-800 dark:text-slate-100"
              >
                {parseInline(header, `${key}-header-${index}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
          {rows.map((row, rowIndex) => (
            <tr key={`${key}-row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${key}-cell-${rowIndex}-${cellIndex}`}
                  className="safe-text px-4 py-3 text-slate-700 dark:text-slate-200"
                >
                  {parseInline(cell, `${key}-cell-${rowIndex}-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseInline(text, keyPrefix) {
  const parts = [];
  let index = 0;

  while (index < text.length) {
    if (text[index] === "`") {
      const end = text.indexOf("`", index + 1);
      if (end !== -1) {
        parts.push(
          <code
            key={`${keyPrefix}-code-${index}`}
            className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.92em] text-violet-700 dark:bg-slate-800 dark:text-violet-200"
          >
            {text.slice(index + 1, end)}
          </code>,
        );
        index = end + 1;
        continue;
      }
    }

    if (text[index] === "[") {
      const labelEnd = text.indexOf("]", index + 1);
      const hrefStart = labelEnd >= 0 ? text.indexOf("(", labelEnd) : -1;
      const hrefEnd = hrefStart === labelEnd + 1 ? text.indexOf(")", hrefStart + 1) : -1;

      if (labelEnd >= 0 && hrefEnd >= 0) {
        const href = getSafeHref(text.slice(hrefStart + 1, hrefEnd));
        const isExternal = /^https?:\/\//i.test(href);

        parts.push(
          <a
            key={`${keyPrefix}-link-${index}`}
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="font-bold text-violet-700 underline decoration-violet-300 underline-offset-4 transition hover:text-amber-700 dark:text-violet-200 dark:decoration-violet-400/60 dark:hover:text-amber-200"
          >
            {parseInline(text.slice(index + 1, labelEnd), `${keyPrefix}-link-${index}`)}
          </a>,
        );
        index = hrefEnd + 1;
        continue;
      }
    }

    if (text.startsWith("**", index) || text.startsWith("__", index)) {
      const marker = text.slice(index, index + 2);
      const end = text.indexOf(marker, index + 2);

      if (end !== -1) {
        parts.push(
          <strong key={`${keyPrefix}-strong-${index}`} className="font-black text-slate-950 dark:text-white">
            {parseInline(text.slice(index + 2, end), `${keyPrefix}-strong-${index}`)}
          </strong>,
        );
        index = end + 2;
        continue;
      }
    }

    if (text[index] === "*" || text[index] === "_") {
      const marker = text[index];
      const end = text.indexOf(marker, index + 1);

      if (end !== -1) {
        parts.push(
          <em key={`${keyPrefix}-em-${index}`} className="italic text-slate-800 dark:text-slate-100">
            {parseInline(text.slice(index + 1, end), `${keyPrefix}-em-${index}`)}
          </em>,
        );
        index = end + 1;
        continue;
      }
    }

    const next = findNextInlineToken(text, index + 1);
    parts.push(text.slice(index, next));
    index = next;
  }

  return parts.map((part, partIndex) =>
    typeof part === "string" ? (
      <Fragment key={`${keyPrefix}-text-${partIndex}`}>{part}</Fragment>
    ) : (
      part
    ),
  );
}

function isBlockStart(lines, index) {
  const line = lines[index];
  return (
    /^```/.test(line) ||
    /^(#{1,6})\s+/.test(line) ||
    isTableStart(lines, index) ||
    isBlockquoteLine(line) ||
    isUnorderedListLine(line) ||
    isOrderedListLine(line)
  );
}

function isBlockquoteLine(line) {
  return /^\s*>\s?/.test(line);
}

function isUnorderedListLine(line) {
  return /^\s*[-*+]\s+/.test(line);
}

function isOrderedListLine(line) {
  return /^\s*\d+[.)]\s+/.test(line);
}

function isTableStart(lines, index) {
  return Boolean(lines[index]?.includes("|") && isTableSeparator(lines[index + 1] || ""));
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")));
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function findNextInlineToken(text, start) {
  const positions = ["`", "[", "*", "_"]
    .map((marker) => text.indexOf(marker, start))
    .filter((position) => position !== -1);

  return positions.length ? Math.min(...positions) : text.length;
}

function getSafeHref(value) {
  const href = String(value || "").trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(href)) return href;
  return "#";
}

export default MarkdownRenderer;
