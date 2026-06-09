"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

type CopyLatexButtonProps = {
  rawLatex: string;
};

export function CopyLatexButton({ rawLatex }: CopyLatexButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(rawLatex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink"
    >
      <Copy className="h-4 w-4" />
      {copied ? "已复制" : "复制 LaTeX"}
    </button>
  );
}
