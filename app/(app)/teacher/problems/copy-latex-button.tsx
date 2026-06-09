"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

type CopyLatexButtonProps = {
  rawLatex: string | null;
  label?: string;
  copiedLabel?: string;
};

export function CopyLatexButton({
  rawLatex,
  label = "复制 LaTeX",
  copiedLabel = "已复制"
}: CopyLatexButtonProps) {
  const [copied, setCopied] = useState(false);
  const disabled = !rawLatex?.trim();

  async function handleCopy() {
    if (!rawLatex?.trim()) {
      return;
    }

    await navigator.clipboard.writeText(rawLatex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Copy className="h-4 w-4" />
      {copied ? copiedLabel : label}
    </button>
  );
}
