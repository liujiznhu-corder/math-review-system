"use client";

import { useMemo } from "react";
import { LatexPreview } from "@/components/latex-preview";

type LatexContentRendererProps = {
  content: string | null;
  fallback?: string;
};

const displayEnvironmentPattern =
  /\\begin\{(cases|aligned|matrix|pmatrix|bmatrix)\}[\s\S]*?\\end\{\1\}/g;

export function LatexContentRenderer({
  content,
  fallback = "暂无内容"
}: LatexContentRendererProps) {
  const normalizedContent = useMemo(
    () => normalizeLatexContent(content ?? ""),
    [content]
  );

  return <LatexPreview content={normalizedContent} fallback={fallback} />;
}

function normalizeLatexContent(content: string) {
  const trimmed = content.trim();

  if (!trimmed) {
    return "";
  }

  return wrapBareDisplayEnvironments(trimmed);
}

function wrapBareDisplayEnvironments(content: string) {
  return content.replace(displayEnvironmentPattern, (match, _environment, offset) => {
    if (isInsideMath(content, offset)) {
      return match;
    }

    return `$$${match}$$`;
  });
}

function isInsideMath(content: string, index: number) {
  const before = content.slice(0, index);
  const dollarCount = (before.match(/\$/g) ?? []).length;
  const displayOpenCount = (before.match(/\\\[/g) ?? []).length;
  const displayCloseCount = (before.match(/\\]/g) ?? []).length;
  const inlineOpenCount = (before.match(/\\\(/g) ?? []).length;
  const inlineCloseCount = (before.match(/\\\)/g) ?? []).length;

  return (
    dollarCount % 2 === 1 ||
    displayOpenCount > displayCloseCount ||
    inlineOpenCount > inlineCloseCount
  );
}
