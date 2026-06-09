"use client";

import { useMemo } from "react";
import katex from "katex";

type LatexPreviewProps = {
  content: string | null;
  fallback?: string;
};

type Segment =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "math";
      value: string;
      displayMode: boolean;
    };

const mathPatterns = [
  { pattern: /\$\$([\s\S]+?)\$\$/g, displayMode: true },
  { pattern: /\\\[([\s\S]+?)\\]/g, displayMode: true },
  { pattern: /\\\(([\s\S]+?)\\\)/g, displayMode: false },
  { pattern: /\$([\s\S]+?)\$/g, displayMode: false }
];

export function LatexPreview({
  content,
  fallback = "暂无内容"
}: LatexPreviewProps) {
  const normalizedContent = content?.trim() ?? "";
  const html = useMemo(() => renderLatexContent(normalizedContent), [
    normalizedContent
  ]);

  if (!normalizedContent) {
    return <p className="text-sm text-ink/55">{fallback}</p>;
  }

  return (
    <div
      className="max-w-none whitespace-pre-wrap break-words text-sm leading-7 text-ink/75"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderLatexContent(content: string) {
  const segments = splitMathSegments(content);

  return segments
    .map((segment) => {
      if (segment.type === "text") {
        return escapeHtml(segment.value);
      }

      return renderMath(segment.value, segment.displayMode);
    })
    .join("");
}

function splitMathSegments(content: string): Segment[] {
  const matches = mathPatterns.flatMap(({ pattern, displayMode }) =>
    Array.from(content.matchAll(pattern)).map((match) => ({
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      value: match[1],
      displayMode
    }))
  );

  const orderedMatches = matches
    .sort((left, right) => left.start - right.start)
    .filter((match, index, list) => {
      const previous = list[index - 1];
      return !previous || match.start >= previous.end;
    });

  if (orderedMatches.length === 0) {
    return [{ type: "text", value: content }];
  }

  const segments: Segment[] = [];
  let cursor = 0;

  for (const match of orderedMatches) {
    if (match.start > cursor) {
      segments.push({
        type: "text",
        value: content.slice(cursor, match.start)
      });
    }

    segments.push({
      type: "math",
      value: match.value,
      displayMode: match.displayMode
    });
    cursor = match.end;
  }

  if (cursor < content.length) {
    segments.push({
      type: "text",
      value: content.slice(cursor)
    });
  }

  return segments;
}

function renderMath(value: string, displayMode: boolean) {
  try {
    return katex.renderToString(value, {
      displayMode,
      throwOnError: true,
      strict: false,
      trust: false
    });
  } catch (error) {
    return `<span class="rounded bg-clay/10 px-1 text-clay" title="${escapeHtml(
      error instanceof Error ? error.message : "KaTeX 渲染失败"
    )}">${escapeHtml(value)}</span>`;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
