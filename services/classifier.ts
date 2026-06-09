export type ClassifierExample = {
  id: string;
  questionTypeId: string;
  exampleText: string;
};

export type ClassifierQuestionType = {
  id: string;
  level1: string;
  level2: string;
  level3: string;
  keywords: string[];
  examples: ClassifierExample[];
};

export type ClassificationResult = {
  questionTypeId: string;
  score: number;
  reasons: string[];
};

type ClassifyInput = {
  stem: string;
  questionTypes: ClassifierQuestionType[];
  limit?: number;
};

export function classifyQuestion({
  stem,
  questionTypes,
  limit = 3
}: ClassifyInput): ClassificationResult[] {
  const normalizedStem = normalizeText(stem);

  return questionTypes
    .map((questionType) => scoreQuestionType(normalizedStem, questionType))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function scoreQuestionType(
  normalizedStem: string,
  questionType: ClassifierQuestionType
): ClassificationResult {
  const reasons: string[] = [];
  let score = 0;

  for (const keyword of questionType.keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) {
      continue;
    }

    if (normalizedStem.includes(normalizedKeyword)) {
      score += 4;
      reasons.push(`关键词：${keyword}`);
    }
  }

  for (const example of questionType.examples) {
    const similarity = jaccardSimilarity(
      tokenize(normalizedStem),
      tokenize(normalizeText(example.exampleText))
    );

    if (similarity > 0) {
      score += similarity * 6;
    }

    if (similarity >= 0.2) {
      reasons.push(`例题相似度：${Math.round(similarity * 100)}%`);
    }
  }

  return {
    questionTypeId: questionType.id,
    score,
    reasons
  };
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。！？；：、,.!?;:()[\]{}]/g, "");
}

function tokenize(value: string) {
  const chars = Array.from(value);
  const tokens = new Set<string>();

  for (const char of chars) {
    tokens.add(char);
  }

  for (let index = 0; index < chars.length - 1; index += 1) {
    tokens.add(`${chars[index]}${chars[index + 1]}`);
  }

  return tokens;
}

function jaccardSimilarity(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;
  left.forEach((token) => {
    if (right.has(token)) {
      intersection += 1;
    }
  });

  return intersection / (left.size + right.size - intersection);
}
