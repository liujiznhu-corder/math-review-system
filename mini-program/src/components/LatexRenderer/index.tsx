import { Fragment, type ReactNode } from "react";
import { RichText, ScrollView, Text, View } from "@tarojs/components";
import "./index.scss";

type LatexRendererProps = {
  title: string;
  description?: string;
  latex: string;
};

type RichTextNode =
  | {
      type: "text";
      text: string;
    }
  | {
      name: string;
      attrs?: Record<string, string>;
      children?: RichTextNode[];
    };

type RenderToken =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "frac";
      numerator: RenderToken[];
      denominator: RenderToken[];
    }
  | {
      type: "sqrt";
      value: RenderToken[];
    }
  | {
      type: "blankbox";
    }
  | {
      type: "choices";
      choices: RenderToken[][];
    }
  | {
      type: "underline";
    };

type ParseResult =
  | {
      ok: true;
      tokens: RenderToken[];
      richTextNodes: RichTextNode[];
    }
  | {
      ok: false;
      error: string;
      fallbackText: string;
    };

const commandMap: Record<string, string> = {
  "\\int": "∫",
  "\\sum": "∑",
  "\\lim": "lim",
  "\\sin": "sin",
  "\\cos": "cos",
  "\\infty": "∞",
  "\\pi": "π",
  "\\to": "→",
  "\\ln": "ln",
  "\\left": "",
  "\\right": ""
};

export function LatexRenderer({
  title,
  description,
  latex
}: LatexRendererProps) {
  const parsed = parseLatex(latex);

  return (
    <View className="latex-card">
      <View className="latex-card-header">
        <View>
          <Text className="latex-card-title">{title}</Text>
          {description ? (
            <Text className="latex-card-description">{description}</Text>
          ) : null}
        </View>
        <Text
          className={`latex-status ${parsed.ok ? "latex-status-ok" : "latex-status-fail"}`}
        >
          {parsed.ok ? "渲染成功" : "渲染失败"}
        </Text>
      </View>

      <View className="latex-section">
        <Text className="latex-section-title">原始 LaTeX</Text>
        <ScrollView scrollX className="latex-raw-scroll">
          <Text className="latex-raw-text">{latex}</Text>
        </ScrollView>
      </View>

      <View className="latex-section">
        <Text className="latex-section-title">方案 A：小程序端直接渲染</Text>
        {parsed.ok ? (
          <ScrollView scrollX className="latex-render-scroll">
            <View className="latex-direct-result">
              {renderDirectTokens(parsed.tokens)}
            </View>
          </ScrollView>
        ) : (
          <FallbackView text={parsed.fallbackText} error={parsed.error} />
        )}
      </View>

      <View className="latex-section">
        <Text className="latex-section-title">
          方案 B：RichText nodes 渲染
        </Text>
        {parsed.ok ? (
          <ScrollView scrollX className="latex-render-scroll">
            <RichText nodes={parsed.richTextNodes} />
          </ScrollView>
        ) : (
          <FallbackView text={parsed.fallbackText} error={parsed.error} />
        )}
      </View>

      {!parsed.ok ? (
        <View className="latex-section">
          <Text className="latex-section-title">降级展示</Text>
          <FallbackView text={parsed.fallbackText} error={parsed.error} />
        </View>
      ) : null}
    </View>
  );
}

function FallbackView({ text, error }: { text: string; error: string }) {
  return (
    <View className="latex-fallback">
      <Text className="latex-fallback-label">{error}</Text>
      <ScrollView scrollX className="latex-raw-scroll">
        <Text className="latex-raw-text">{text}</Text>
      </ScrollView>
    </View>
  );
}

function parseLatex(input: string): ParseResult {
  try {
    const tokens = parseTokens(input, 0, input.length).tokens;
    return {
      ok: true,
      tokens,
      richTextNodes: tokensToRichTextNodes(tokens)
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "未知解析错误",
      fallbackText: input
    };
  }
}

function parseTokens(source: string, start: number, end: number) {
  const tokens: RenderToken[] = [];
  let buffer = "";
  let index = start;

  const flush = () => {
    if (buffer) {
      tokens.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  while (index < end) {
    const char = source[index];

    if (char === "$") {
      index += 1;
      continue;
    }

    if (source.startsWith("\\blankbox", index)) {
      flush();
      tokens.push({ type: "blankbox" });
      index += "\\blankbox".length;
      continue;
    }

    if (source.startsWith("\\fourchoices", index)) {
      flush();
      index += "\\fourchoices".length;
      const choices: RenderToken[][] = [];
      for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
        index = skipWhitespace(source, index);
        const brace = readBraceContent(source, index);
        choices.push(parseTokens(brace.content, 0, brace.content.length).tokens);
        index = brace.nextIndex;
      }
      tokens.push({ type: "choices", choices });
      continue;
    }

    if (source.startsWith("\\frac", index)) {
      flush();
      index += "\\frac".length;
      index = skipWhitespace(source, index);
      const numerator = readBraceContent(source, index);
      index = skipWhitespace(source, numerator.nextIndex);
      const denominator = readBraceContent(source, index);
      index = denominator.nextIndex;
      tokens.push({
        type: "frac",
        numerator: parseTokens(numerator.content, 0, numerator.content.length)
          .tokens,
        denominator: parseTokens(
          denominator.content,
          0,
          denominator.content.length
        ).tokens
      });
      continue;
    }

    if (source.startsWith("\\sqrt", index)) {
      flush();
      index += "\\sqrt".length;
      index = skipWhitespace(source, index);
      const value = readBraceContent(source, index);
      index = value.nextIndex;
      tokens.push({
        type: "sqrt",
        value: parseTokens(value.content, 0, value.content.length).tokens
      });
      continue;
    }

    if (
      source.startsWith("\\_\\_\\_", index) ||
      source.startsWith("\\_\\_", index) ||
      source.startsWith("___", index)
    ) {
      flush();
      tokens.push({ type: "underline" });
      index += source.startsWith("___", index) ? 3 : "\\_\\_\\_".length;
      continue;
    }

    const command = findKnownCommand(source, index);
    if (command) {
      buffer += commandMap[command];
      index += command.length;
      continue;
    }

    if (char === "\\") {
      const unknown = readCommandName(source, index);
      if (unknown.length > 1) {
        throw new Error(`暂不支持的 LaTeX 命令：${unknown}`);
      }
    }

    buffer += char;
    index += 1;
  }

  flush();
  return { tokens, nextIndex: index };
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

function skipWhitespace(source: string, index: number) {
  let cursor = index;
  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function findKnownCommand(source: string, index: number) {
  return Object.keys(commandMap)
    .sort((left, right) => right.length - left.length)
    .find((command) => source.startsWith(command, index));
}

function readCommandName(source: string, index: number) {
  let cursor = index + 1;
  while (cursor < source.length && /[A-Za-z]/.test(source[cursor])) {
    cursor += 1;
  }
  return source.slice(index, cursor);
}

function renderDirectTokens(tokens: RenderToken[]): ReactNode {
  return tokens.map((token, index) => (
    <Fragment key={`${token.type}-${index}`}>
      {renderDirectToken(token, index)}
    </Fragment>
  ));
}

function renderDirectToken(token: RenderToken, index: number): ReactNode {
  if (token.type === "text") {
    return (
      <Text key={index} className="latex-inline-text">
        {token.value}
      </Text>
    );
  }

  if (token.type === "blankbox") {
    return <Text key={index} className="latex-blankbox" />;
  }

  if (token.type === "underline") {
    return <Text key={index} className="latex-underline" />;
  }

  if (token.type === "sqrt") {
    return (
      <Text key={index} className="latex-sqrt">
        √({renderPlainText(token.value)})
      </Text>
    );
  }

  if (token.type === "frac") {
    return (
      <View key={index} className="latex-frac">
        <Text className="latex-frac-part">{renderPlainText(token.numerator)}</Text>
        <View className="latex-frac-line" />
        <Text className="latex-frac-part">{renderPlainText(token.denominator)}</Text>
      </View>
    );
  }

  return (
    <View key={index} className="latex-choices">
      {token.choices.map((choice, choiceIndex) => (
        <View key={choiceIndex} className="latex-choice-row">
          <Text className="latex-choice-label">
            {String.fromCharCode(65 + choiceIndex)}.
          </Text>
          <Text className="latex-choice-text">{renderPlainText(choice)}</Text>
        </View>
      ))}
    </View>
  );
}

function tokensToRichTextNodes(tokens: RenderToken[]): RichTextNode[] {
  return [
    {
      name: "div",
      attrs: {
        style:
          "min-width:max-content;font-size:18px;line-height:1.8;color:#111827;white-space:nowrap;"
      },
      children: tokens.flatMap(tokenToRichTextNodes)
    }
  ];
}

function tokenToRichTextNodes(token: RenderToken): RichTextNode[] {
  if (token.type === "text") {
    return [{ type: "text", text: token.value }];
  }

  if (token.type === "blankbox") {
    return [
      {
        name: "span",
        attrs: {
          style:
            "display:inline-block;width:72px;height:24px;border:1px solid #0f4f3f;border-radius:4px;vertical-align:middle;margin:0 4px;"
        }
      }
    ];
  }

  if (token.type === "underline") {
    return [
      {
        name: "span",
        attrs: {
          style:
            "display:inline-block;width:96px;border-bottom:1px solid #111827;margin:0 4px;vertical-align:middle;"
        },
        children: [{ type: "text", text: " " }]
      }
    ];
  }

  if (token.type === "sqrt") {
    return [{ type: "text", text: `√(${renderPlainText(token.value)})` }];
  }

  if (token.type === "frac") {
    return [
      {
        name: "span",
        attrs: {
          style:
            "display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 4px;"
        },
        children: [
          {
            name: "span",
            attrs: { style: "display:block;padding:0 4px;" },
            children: [{ type: "text", text: renderPlainText(token.numerator) }]
          },
          {
            name: "span",
            attrs: {
              style:
                "display:block;width:100%;height:1px;background:#111827;margin:1px 0;"
            }
          },
          {
            name: "span",
            attrs: { style: "display:block;padding:0 4px;" },
            children: [{ type: "text", text: renderPlainText(token.denominator) }]
          }
        ]
      }
    ];
  }

  return [
    {
      name: "div",
      attrs: {
        style:
          "display:flex;flex-direction:column;gap:6px;margin-top:8px;white-space:normal;"
      },
      children: token.choices.map((choice, index) => ({
        name: "div",
        attrs: {
          style:
            "display:flex;gap:6px;padding:6px 8px;border:1px solid #e8e2d8;border-radius:8px;background:#ffffff;"
        },
        children: [
          { type: "text", text: `${String.fromCharCode(65 + index)}. ` },
          { type: "text", text: renderPlainText(choice) }
        ]
      }))
    }
  ];
}

function renderPlainText(tokens: RenderToken[]): string {
  return tokens
    .map((token) => {
      if (token.type === "text") {
        return token.value;
      }
      if (token.type === "blankbox") {
        return "□";
      }
      if (token.type === "underline") {
        return "____";
      }
      if (token.type === "sqrt") {
        return `√(${renderPlainText(token.value)})`;
      }
      if (token.type === "frac") {
        return `(${renderPlainText(token.numerator)})/(${renderPlainText(
          token.denominator
        )})`;
      }
      return token.choices
        .map(
          (choice, index) =>
            `${String.fromCharCode(65 + index)}. ${renderPlainText(choice)}`
        )
        .join("  ");
    })
    .join("");
}
