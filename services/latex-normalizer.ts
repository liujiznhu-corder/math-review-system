export type ParsedFourChoices = [string, string, string, string];

export type NormalizedLatexProblem = {
  plainText: string;
  options: ParsedFourChoices | null;
};

export function normalizeLatexProblem(rawLatex: string): NormalizedLatexProblem {
  const options = parseFourChoices(rawLatex);
  const withBlankText = rawLatex.replace(/\\blankbox\b/g, " 填空 ");
  const withoutFourChoices = expandFourChoices(withBlankText);
  const plainText = stripLatexCommands(withoutFourChoices);

  return {
    plainText,
    options
  };
}

function expandFourChoices(content: string) {
  let output = "";
  let cursor = 0;

  while (cursor < content.length) {
    const commandIndex = content.indexOf("\\fourchoices", cursor);

    if (commandIndex === -1) {
      output += content.slice(cursor);
      break;
    }

    output += content.slice(cursor, commandIndex);

    let groupCursor = commandIndex + "\\fourchoices".length;
    const choices: string[] = [];

    for (let index = 0; index < 4; index += 1) {
      groupCursor = skipWhitespace(content, groupCursor);
      const group = readBracedGroup(content, groupCursor);

      if (!group) {
        output += content.slice(commandIndex, groupCursor);
        cursor = groupCursor;
        break;
      }

      choices.push(group.value);
      groupCursor = group.end;
    }

    if (choices.length === 4) {
      output += ` ${choices.join(" ")} `;
      cursor = groupCursor;
    }
  }

  return output;
}

export function parseFourChoices(rawLatex: string): ParsedFourChoices | null {
  const commandIndex = rawLatex.indexOf("\\fourchoices");

  if (commandIndex === -1) {
    return null;
  }

  let cursor = commandIndex + "\\fourchoices".length;
  const choices: string[] = [];

  for (let index = 0; index < 4; index += 1) {
    cursor = skipWhitespace(rawLatex, cursor);
    const group = readBracedGroup(rawLatex, cursor);

    if (!group) {
      return null;
    }

    choices.push(group.value.trim());
    cursor = group.end;
  }

  return choices as ParsedFourChoices;
}

export function stripLatexCommands(value: string) {
  return value
    .replace(/\\(?:begin|end)\{[^}]+\}/g, " ")
    .replace(/\\limits\b/g, " ")
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*])?(?:\{([^{}]*)\})?/g, " $1 ")
    .replace(/[{}_^$&%#~]/g, " ")
    .replace(/\\\\/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
