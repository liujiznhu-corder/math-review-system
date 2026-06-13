import { useMemo, type ReactNode } from "react";
import { RichText, ScrollView, Text, View } from "@tarojs/components";
import parseLatex from "@rojer/katex-mini";
import "@rojer/katex-mini/dist/index.css";
import "./index.scss";

type LatexRendererProps = {
  title?: string;
  category?: string;
  description?: string;
  acceptance?: string;
  latex: string;
  mode?: "preview" | "full";
  variant?: "full" | "preview" | "compact" | "poc";
};

type RichTextNode = {
  type?: string;
  name?: string;
  attrs?: Record<string, unknown>;
  children?: RichTextNode[];
  text?: string;
};

type RenderSegment =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "math";
      source: string;
      displayMode: boolean;
      nodes: RichTextNode[];
      ok: true;
    }
  | {
      type: "blank";
    }
  | {
      type: "choices";
      choices: RenderSegment[][];
    }
  | {
      type: "fallback";
      source: string;
      error: string;
      displayMode?: boolean;
    };

type ParseResult = {
  ok: boolean;
  status: LatexRenderStatus;
  segments: RenderSegment[];
  raw: string;
  preview: string;
  error?: string;
};

export type LatexRenderStatus = "success" | "fallback" | "error";

export type LatexDebugSegment = {
  type: RenderSegment["type"];
  displayMode?: boolean;
  raw?: string;
  katexContent?: string;
  error?: string;
  choices?: LatexDebugSegment[][];
};

export type LatexDebugInfo = {
  raw: string;
  normalized: string;
  status: LatexRenderStatus;
  error?: string;
  segments: LatexDebugSegment[];
};

const parseCache = new Map<string, RichTextNode[]>();
const resultCache = new Map<string, ParseResult>();
const MAX_CACHE_SIZE = 80;

const mathCommandPattern =
  /\\(?:frac|sqrt|lim|sum|int|sin|cos|tan|ln|pi|infty|Delta|to|limits|begin|end)|[_^{}]/;

const customCommandPattern = /\\(?:blankbox|fourchoices)/;

export function LatexRenderer({
  title = "题目",
  category,
  description,
  acceptance,
  latex,
  mode,
  variant
}: LatexRendererProps) {
  const resolvedMode = resolveMode(mode, variant);
  const parsed = useMemo(() => renderLatex(latex), [latex]);

  if (resolvedMode === "preview") {
    return <Text className="latex-preview-text">{parsed.preview}</Text>;
  }

  if (!acceptance) {
    return (
      <View className="latex-full-render">
        <View className="latex-render-box">{renderSegments(parsed.segments)}</View>
      </View>
    );
  }

  return (
    <View className="latex-card">
      <View className="latex-card-header">
        <View className="latex-card-heading">
          <Text className="latex-card-title">{title}</Text>
          {description ? (
            <Text className="latex-card-description">{description}</Text>
          ) : null}
          {category ? (
            <Text className="latex-card-category">{category}</Text>
          ) : null}
        </View>
        <Text
          className={`latex-status ${
            parsed.ok ? "latex-status-ok" : "latex-status-fallback"
          }`}
        >
          {parsed.status}
        </Text>
      </View>

      <View className="latex-section">
        <Text className="latex-section-title">原始 LaTeX</Text>
        <ScrollView scrollX className="latex-raw-scroll">
          <View className="latex-raw-inner">
            <Text className="latex-raw-text">{parsed.raw}</Text>
          </View>
        </ScrollView>
      </View>

      <View className="latex-section">
        <Text className="latex-section-title">渲染结果</Text>
        <View className="latex-render-box">{renderSegments(parsed.segments)}</View>
      </View>

      {acceptance ? (
        <View className="latex-section">
          <Text className="latex-section-title">人工验收点</Text>
          <Text className="latex-acceptance-text">{acceptance}</Text>
        </View>
      ) : null}

      {!parsed.ok ? (
        <View className="latex-section">
          <Text className="latex-section-title">降级信息</Text>
          <Text className="latex-fallback-label">
            {parsed.error ?? "LaTeX 解析失败"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function resolveMode(
  mode?: LatexRendererProps["mode"],
  variant?: LatexRendererProps["variant"]
): "preview" | "full" {
  if (mode) {
    return mode;
  }

  if (variant === "preview") {
    return "preview";
  }

  return "full";
}

function renderLatex(input: string): ParseResult {
  const cached = resultCache.get(input);
  if (cached) {
    return cached;
  }

  const preview = sanitizeLatexToReadable(input);

  try {
    const segments = parseMixedContent(normalizeLatex(input));
    const fallback = findFallbackSegment(segments);
    const result: ParseResult = {
      ok: !fallback,
      status: fallback ? "fallback" : "success",
      segments,
      raw: input,
      preview,
      error: fallback?.error
    };
    remember(resultCache, input, result);
    return result;
  } catch (error) {
    const message = getErrorMessage(error);
    warnLatexFallback(input, message);

    const result: ParseResult = {
      ok: false,
      status: "error",
      raw: input,
      preview,
      error: message,
      segments: [
        {
          type: "fallback",
          source: input,
          error: message
        }
      ]
    };
    remember(resultCache, input, result);
    return result;
  }
}

export function getLatexRenderStatus(input: string): LatexRenderStatus {
  return renderLatex(input).status;
}

export function getLatexDebugInfo(input: string): LatexDebugInfo {
  const normalized = normalizeLatex(input);
  const parsed = renderLatex(input);

  return {
    raw: input,
    normalized,
    status: parsed.status,
    error: parsed.error,
    segments: parsed.segments.map(toDebugSegment)
  };
}

function parseMixedContent(input: string, options: { preferInlineMath?: boolean } = {}): RenderSegment[] {
  const source = normalizeTextInput(input);
  const trimmed = source.trim();
  const useDisplayForUndelimitedMath = shouldUseDisplayForUndelimitedMath(
    trimmed,
    options
  );

  if (trimmed === "\\blankbox") {
    return [{ type: "blank" }];
  }

  if (trimmed.startsWith("\\[") && trimmed.endsWith("\\]")) {
    return [createMathSegment(trimmed.slice(2, -2), true)];
  }

  if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
    return [createMathSegment(trimmed.slice(2, -2), true)];
  }

  if (
    !customCommandPattern.test(trimmed) &&
    !trimmed.includes("$") &&
    looksLikeStandaloneFormula(trimmed)
  ) {
    return [createMathSegment(trimmed, !options.preferInlineMath)];
  }

  const segments: RenderSegment[] = [];
  let index = 0;

  while (index < source.length) {
    if (source.startsWith("\\[", index)) {
      const closeIndex = source.indexOf("\\]", index + 2);
      if (closeIndex < 0) {
        segments.push(
          createFallbackSegment(source.slice(index), "块级公式缺少结束符 \\]", true)
        );
        break;
      }

      segments.push(createMathSegment(source.slice(index + 2, closeIndex), true));
      index = closeIndex + 2;
      continue;
    }

    if (source.startsWith("$$", index)) {
      const closeIndex = source.indexOf("$$", index + 2);
      if (closeIndex < 0) {
        segments.push(
          createFallbackSegment(source.slice(index), "块级公式缺少结束符 $$", true)
        );
        break;
      }

      segments.push(createMathSegment(source.slice(index + 2, closeIndex), true));
      index = closeIndex + 2;
      continue;
    }

    if (source[index] === "$") {
      const closeIndex = source.indexOf("$", index + 1);
      if (closeIndex < 0) {
        segments.push(createFallbackSegment(source.slice(index), "行内公式缺少结束符 $"));
        break;
      }

      segments.push(createMathSegment(source.slice(index + 1, closeIndex), false));
      index = closeIndex + 1;
      continue;
    }

    if (source.startsWith("\\blankbox", index)) {
      segments.push({ type: "blank" });
      index += "\\blankbox".length;
      continue;
    }

    if (source.startsWith("\\fourchoices", index)) {
      const parsedChoices = parseFourChoices(source, index);
      segments.push({
        type: "choices",
        choices: parsedChoices.choices.map((choice) =>
          parseMixedContent(choice, { preferInlineMath: true })
        )
      });
      index = parsedChoices.nextIndex;
      continue;
    }

    const nextSpecialIndex = findNextSpecialIndex(source, index + 1);
    const endIndex = nextSpecialIndex >= 0 ? nextSpecialIndex : source.length;
    const chunk = source.slice(index, endIndex);

    if (looksLikeUndelimitedMathChunk(chunk)) {
      segments.push(createMathSegment(chunk, useDisplayForUndelimitedMath));
      index = endIndex;
      continue;
    }

    segments.push({
      type: "text",
      text: chunk
    });
    index = endIndex;
  }

  return mergeTextSegments(segments);
}

function createMathSegment(source: string, displayMode: boolean): RenderSegment {
  const normalizedSource = normalizeMathSource(source, displayMode);

  try {
    const cacheKey = `${displayMode ? "display" : "inline"}:${normalizedSource}`;
    const cached = parseCache.get(cacheKey);
    if (cached) {
      return {
        type: "math",
        source: normalizedSource,
        displayMode,
        nodes: cached,
        ok: true
      };
    }

    const nodes = parseLatex(normalizedSource, {
      displayMode,
      throwError: true,
      strict: "ignore",
      trust: false
    }) as RichTextNode[];

    remember(parseCache, cacheKey, nodes);

    return {
      type: "math",
      source: normalizedSource,
      displayMode,
      nodes,
      ok: true
    };
  } catch (error) {
    const message = getErrorMessage(error);
    warnLatexFallback(normalizedSource, message);
    return createFallbackSegment(normalizedSource, message, displayMode);
  }
}

function createFallbackSegment(
  source: string,
  error: string,
  displayMode = false
): RenderSegment {
  return {
    type: "fallback",
    source,
    error,
    displayMode
  };
}

function renderSegments(segments: RenderSegment[]): ReactNode {
  const groups = groupSegmentsForRender(segments);

  return groups.map((group, index) => {
    if (group.type === "inline-flow") {
      return (
        <View key={index} className="latex-inline-flow">
          {group.segments.map((segment, segmentIndex) =>
            renderSegment(segment, segmentIndex, true)
          )}
        </View>
      );
    }

    return renderSegment(group.segment, index, false);
  });
}

function renderSegment(
  segment: RenderSegment,
  index: number,
  inInlineFlow = false
): ReactNode {
  if (segment.type === "text") {
    return (
      <Text key={index} className="latex-plain-text">
        {segment.text}
      </Text>
    );
  }

  if (segment.type === "math") {
    if (!segment.displayMode) {
      return (
        <View key={index} className="latex-inline-math">
          <RichText className="latex-rich-text" nodes={segment.nodes as never} />
        </View>
      );
    }

    return (
      <ScrollView
        key={index}
        scrollX
        className={`latex-display-scroll ${
          inInlineFlow ? "latex-flow-math-scroll" : ""
        }`}
      >
        <View className="latex-display-inner">
          <RichText className="latex-rich-text" nodes={segment.nodes as never} />
        </View>
      </ScrollView>
    );
  }

  if (segment.type === "blank") {
    return <View key={index} className="latex-blankbox" />;
  }

  if (segment.type === "choices") {
    return (
      <View key={index} className="latex-choices">
        {segment.choices.map((choice, choiceIndex) => (
          <View key={choiceIndex} className="latex-choice-row">
            <Text className="latex-choice-label">
              {String.fromCharCode(65 + choiceIndex)}
            </Text>
            <View className="latex-choice-content">{renderSegments(choice)}</View>
          </View>
        ))}
      </View>
    );
  }

  if (!segment.displayMode) {
    return (
      <Text key={index} className="latex-inline-fallback-text">
        {sanitizeLatexToReadable(segment.source) || segment.source}
      </Text>
    );
  }

  return (
    <View key={index} className="latex-block-fallback">
      <Text className="latex-fallback-label">{segment.error}</Text>
      <ScrollView scrollX className="latex-fallback-scroll">
        <View className="latex-fallback-inner">
          <Text className="latex-fallback-text">{segment.source}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

type RenderGroup =
  | {
      type: "inline-flow";
      segments: RenderSegment[];
    }
  | {
      type: "block";
      segment: RenderSegment;
    };

function groupSegmentsForRender(segments: RenderSegment[]): RenderGroup[] {
  const groups: RenderGroup[] = [];
  let inlineSegments: RenderSegment[] = [];

  const flushInlineSegments = () => {
    if (inlineSegments.length > 0) {
      groups.push({
        type: "inline-flow",
        segments: inlineSegments
      });
      inlineSegments = [];
    }
  };

  for (const segment of segments) {
    if (isInlineFlowSegment(segment)) {
      inlineSegments.push(segment);
      continue;
    }

    flushInlineSegments();
    groups.push({ type: "block", segment });
  }

  flushInlineSegments();
  return groups;
}

function isInlineFlowSegment(segment: RenderSegment) {
  if (segment.type === "text" || segment.type === "math" || segment.type === "blank") {
    return true;
  }

  return segment.type === "fallback" && !segment.displayMode;
}

function parseFourChoices(source: string, startIndex: number) {
  let index = startIndex + "\\fourchoices".length;
  const choices: string[] = [];

  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    index = skipWhitespace(source, index);
    const brace = readBraceContent(source, index);
    choices.push(brace.content);
    index = brace.nextIndex;
  }

  return { choices, nextIndex: index };
}

function readBraceContent(source: string, openIndex: number) {
  if (source[openIndex] !== "{") {
    throw new Error("LaTeX 参数缺少左花括号");
  }

  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          content: source.slice(openIndex + 1, index),
          nextIndex: index + 1
        };
      }
    }
  }

  throw new Error("LaTeX 参数缺少右花括号");
}

function normalizeLatex(input: string) {
  return normalizeTextInput(input)
    .replace(/\\begin\{align\*\}/g, "\\begin{aligned}")
    .replace(/\\end\{align\*\}/g, "\\end{aligned}")
    .replace(/\\left\{/g, "\\left\\{")
    .replace(/\\right\}/g, "\\right\\}")
    .replace(/\\boldsymbol\s*\{/g, "\\mathbf{")
    .replace(/\\(sin|cos|tan)\^([A-Za-z0-9])/g, "\\$1^{$2}")
    .replace(/\\(sin|cos|tan)\^\{([^{}]+)\}\s+/g, "\\$1^{$2}");
}

function normalizeTextInput(source: string) {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/(^|\n)\s*\[\s*(?=\n)/g, "$1\\[\n")
    .replace(/(^|\n)\s*\]\s*(?=\n|$)/g, "$1\\]\n")
    .replace(/\\_\\_\\_|\\_\\_|___/g, "\\blankbox");
}

function normalizeMathSource(source: string, displayMode: boolean) {
  const normalized = stripMathDelimiters(normalizeLatex(source))
    .trim()
    .replace(/\\,/g, " ");

  if (!displayMode) {
    return normalized;
  }

  return normalized.replace(/\\lim(?!\\limits)\s*_\s*\{/g, "\\lim\\limits_{");
}

function stripMathDelimiters(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("\\[") && trimmed.endsWith("\\]")) {
    return trimmed.slice(2, -2);
  }

  if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
    return trimmed.slice(2, -2);
  }

  if (
    trimmed.startsWith("$") &&
    trimmed.endsWith("$") &&
    trimmed.length >= 2 &&
    !trimmed.startsWith("$$")
  ) {
    return trimmed.slice(1, -1);
  }

  return value;
}

function looksLikeStandaloneFormula(source: string) {
  if (!source) {
    return false;
  }

  if (source.includes("$") || customCommandPattern.test(source)) {
    return false;
  }

  return mathCommandPattern.test(source);
}

function looksLikeUndelimitedMathChunk(source: string) {
  const trimmed = source.trim();
  if (!trimmed || !mathCommandPattern.test(trimmed) || customCommandPattern.test(trimmed)) {
    return false;
  }

  return !/[\u4e00-\u9fff]/.test(trimmed);
}

function shouldUseDisplayForUndelimitedMath(
  source: string,
  options: { preferInlineMath?: boolean }
) {
  if (options.preferInlineMath || source.includes("$")) {
    return false;
  }

  return mathCommandPattern.test(source) && !/[\u4e00-\u9fff]/.test(source);
}

function findNextSpecialIndex(source: string, startIndex: number) {
  const candidates = [
    source.indexOf("\\[", startIndex),
    source.indexOf("$$", startIndex),
    source.indexOf("$", startIndex),
    source.indexOf("\\blankbox", startIndex),
    source.indexOf("\\fourchoices", startIndex)
  ].filter((index) => index >= 0);

  return candidates.length > 0 ? Math.min(...candidates) : -1;
}

function mergeTextSegments(segments: RenderSegment[]) {
  return segments.reduce<RenderSegment[]>((merged, segment) => {
    const last = merged[merged.length - 1];
    if (last?.type === "text" && segment.type === "text") {
      last.text += segment.text;
      return merged;
    }

    merged.push(segment);
    return merged;
  }, []);
}

function findFallbackSegment(
  segments: RenderSegment[]
): Extract<RenderSegment, { type: "fallback" }> | undefined {
  for (const segment of segments) {
    if (segment.type === "fallback") {
      return segment;
    }

    if (segment.type === "choices") {
      const fallback = segment.choices
        .map((choice) => findFallbackSegment(choice))
        .find(Boolean);

      if (fallback) {
        return fallback;
      }
    }
  }

  return undefined;
}

function skipWhitespace(source: string, index: number) {
  let cursor = index;
  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function remember<K, V>(cache: Map<K, V>, key: K, value: V) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value as K | undefined;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }
  cache.set(key, value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "LaTeX 解析失败";
}

function warnLatexFallback(source: string, error: string) {
  console.warn("[LatexRenderer] fallback", { source, error });
}

function toDebugSegment(segment: RenderSegment): LatexDebugSegment {
  if (segment.type === "math") {
    return {
      type: segment.type,
      displayMode: segment.displayMode,
      raw: segment.source,
      katexContent: segment.source
    };
  }

  if (segment.type === "text") {
    return {
      type: segment.type,
      raw: segment.text
    };
  }

  if (segment.type === "fallback") {
    return {
      type: segment.type,
      displayMode: segment.displayMode,
      raw: segment.source,
      katexContent: stripMathDelimiters(segment.source),
      error: segment.error
    };
  }

  if (segment.type === "choices") {
    return {
      type: segment.type,
      choices: segment.choices.map((choice) => choice.map(toDebugSegment))
    };
  }

  return {
    type: segment.type
  };
}

function sanitizeLatexToReadable(source: string) {
  return normalizeTextInput(source)
    .replace(/\$/g, "")
    .replace(/\\blankbox/g, "□")
    .replace(/\\fourchoices/g, " ")
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)")
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\infty/g, "∞")
    .replace(/\\pi/g, "π")
    .replace(/\\to/g, "→")
    .replace(/\\int/g, "∫")
    .replace(/\\sum/g, "∑")
    .replace(/\\lim(?:\\limits)?/g, "lim")
    .replace(/\\sin/g, "sin")
    .replace(/\\cos/g, "cos")
    .replace(/\\tan/g, "tan")
    .replace(/\\ln/g, "ln")
    .replace(/\\,/g, " ")
    .replace(/\\/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
