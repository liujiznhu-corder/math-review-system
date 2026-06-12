"use client";

import { useMemo } from "react";
import { LatexPreview } from "@/components/latex-preview";

type LatexProblemRendererProps = {
  rawLatex: string | null;
  fallback?: string;
};

type ParsedProblemLatex = {
  stem: string;
  choices: [string, string, string, string] | null;
  parseError: string | null;
};

export function LatexProblemRenderer({
  rawLatex,
  fallback = "暂无题目"
}: LatexProblemRendererProps) {
  const content = rawLatex ?? "";
  const parsed = useMemo(() => parseProblemLatex(content), [content]);

  if (!content.trim()) {
    return <p className="text-sm text-ink/55">{fallback}</p>;
  }

  return (
    <div className="max-w-full space-y-3 overflow-x-auto text-sm leading-7 text-ink/75">
      {parsed.parseError ? (
        <p className="rounded-md border border-clay/25 bg-clay/10 px-3 py-2 text-sm text-clay">
          {parsed.parseError}
        </p>
      ) : null}

      <LatexPreview content={parsed.stem} fallback={fallback} />

      {parsed.choices ? <ChoiceList choices={parsed.choices} /> : null}
    </div>
  );
}

function ChoiceList({ choices }: { choices: [string, string, string, string] }) {
  const labels = ["A", "B", "C", "D"];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {choices.map((choice, index) => (
        <div
          key={`${labels[index]}-${choice}`}
          className="min-w-0 overflow-x-auto rounded-md bg-white px-3 py-2 sm:flex sm:items-start sm:gap-2"
        >
          <span className="font-medium text-ink">{labels[index]}.</span>
          <LatexPreview content={choice} />
        </div>
      ))}
    </div>
  );
}

function parseProblemLatex(content: string): ParsedProblemLatex {
  const parsedChoices = extractFourChoices(content);
  const hasFourChoices = content.includes("\\fourchoices");
  const stemSource = parsedChoices
    ? content.slice(0, parsedChoices.start) + content.slice(parsedChoices.end)
    : content;
  const stemWithBlankBox = stemSource.replace(/\\blankbox\b/g, "（　　　）");

  return {
    stem: replaceTextModeFillLines(stemWithBlankBox),
    choices: parsedChoices?.choices ?? null,
    parseError:
      hasFourChoices && !parsedChoices
        ? "\\fourchoices 解析失败，请检查是否包含 4 个花括号选项。"
        : null
  };
}

function replaceTextModeFillLines(content: string) {
  return transformTextOutsideMath(content, (text) =>
    text.replace(/(?:\\_){3,}|_{3,}/g, "__________")
  );
}

function transformTextOutsideMath(
  content: string,
  transform: (text: string) => string
) {
  let output = "";
  let cursor = 0;

  while (cursor < content.length) {
    const next = findNextMathStart(content, cursor);

    if (!next) {
      output += transform(content.slice(cursor));
      break;
    }

    output += transform(content.slice(cursor, next.start));

    const end = content.indexOf(next.close, next.start + next.open.length);

    if (end === -1) {
      output += content.slice(next.start);
      break;
    }

    output += content.slice(next.start, end + next.close.length);
    cursor = end + next.close.length;
  }

  return output;
}

function findNextMathStart(content: string, start: number) {
  const candidates = [
    { open: "$$", close: "$$" },
    { open: "\\[", close: "\\]" },
    { open: "\\(", close: "\\)" },
    { open: "$", close: "$" }
  ]
    .map((delimiter) => ({
      ...delimiter,
      start: content.indexOf(delimiter.open, start)
    }))
    .filter((candidate) => candidate.start >= 0)
    .sort(
      (left, right) =>
        left.start - right.start || right.open.length - left.open.length
    );

  return candidates[0] ?? null;
}

function extractFourChoices(content: string) {
  const commandIndex = content.indexOf("\\fourchoices");

  if (commandIndex === -1) {
    return null;
  }

  let cursor = commandIndex + "\\fourchoices".length;
  const choices: string[] = [];

  for (let index = 0; index < 4; index += 1) {
    cursor = skipWhitespace(content, cursor);
    const group = readBracedGroup(content, cursor);

    if (!group) {
      return null;
    }

    choices.push(group.value.trim());
    cursor = group.end;
  }

  return {
    start: commandIndex,
    end: cursor,
    choices: choices as [string, string, string, string]
  };
}

function readBracedGroup(content: string, start: number) {
  if (content[start] !== "{") {
    return null;
  }

  let depth = 0;
  let escaped = false;

  for (let index = start; index < content.length; index += 1) {
    const char = content[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return {
          value: content.slice(start + 1, index),
          end: index + 1
        };
      }
    }
  }

  return null;
}

function skipWhitespace(content: string, start: number) {
  let cursor = start;

  while (cursor < content.length && /\s/.test(content[cursor])) {
    cursor += 1;
  }

  return cursor;
}
