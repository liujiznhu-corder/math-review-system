import { stripLatexCommands } from "@/services/latex-normalizer";

export type MistakeInputType = "plain_text" | "latex";

export function stripLatexToText(value: string) {
  return stripLatexCommands(value);
}

export function getClassificationText({
  inputType,
  rawText,
  latexContent
}: {
  inputType: MistakeInputType;
  rawText: string;
  latexContent: string;
}) {
  if (inputType === "latex") {
    return stripLatexToText(latexContent) || latexContent.trim();
  }

  return rawText.trim();
}
