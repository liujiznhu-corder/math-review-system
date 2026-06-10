import { createClient } from "@/lib/supabase/server";
import { normalizeLatexProblem } from "@/services/latex-normalizer";
import type { StudentApiErrorCode } from "@/app/api/student/_utils";
import type { Database } from "@/types/database";

const PRACTICE_QUESTION_COUNT = 5;

type PracticeResult =
  Database["public"]["Tables"]["practice_records"]["Row"]["result"];

type PracticeSessionStatus =
  Database["public"]["Tables"]["practice_sessions"]["Row"]["status"];

type ProblemType = Database["public"]["Tables"]["problems"]["Row"]["problem_type"];

export type PracticeQuestionType = {
  id: string;
  level1: string;
  level2: string;
  level3: string;
  availableProblemCount: number;
};

export type PracticeRecordView = {
  id: string;
  position: number;
  status: "pending" | "completed";
  result: PracticeResult;
  answeredAt: string | null;
  addedToMistakesAt: string | null;
  createdMistakeId: string | null;
  problem: {
    id: string;
    rawLatex: string;
    displayLatex: string;
    answer: string | null;
    analysis: string | null;
    questionType: PracticeQuestionType | null;
  } | null;
};

export type PracticeSessionView = {
  id: string;
  questionTypeId: string;
  questionCount: number;
  status: PracticeSessionStatus;
  startedAt: string;
  completedAt: string | null;
  hasSupplementedProblems: boolean;
  questionType: Omit<PracticeQuestionType, "availableProblemCount"> | null;
  records: PracticeRecordView[];
};

type QuestionTypeRow = {
  id: string;
  level1: string;
  level2: string;
  level3: string;
};

type ProblemRow = {
  id: string;
  question_type_id: string | null;
  problem_type: ProblemType;
  raw_latex: string;
  answer: string | null;
  analysis: string | null;
  question_types: QuestionTypeRow | QuestionTypeRow[] | null;
};

type PracticeSessionRow = {
  id: string;
  question_type_id: string;
  question_count: number;
  status: PracticeSessionStatus;
  started_at: string;
  completed_at: string | null;
  question_types: QuestionTypeRow | QuestionTypeRow[] | null;
};

type PracticeRecordRow = {
  id: string;
  position: number;
  status: "pending" | "completed";
  result: PracticeResult;
  answered_at: string | null;
  added_to_mistakes_at: string | null;
  created_mistake_id: string | null;
  problems: ProblemRow | ProblemRow[] | null;
};

type CandidateProblem = {
  id: string;
  questionTypeId: string;
  problemType: ProblemType;
  rawLatex: string;
  answer: string | null;
  analysis: string | null;
  questionType: QuestionTypeRow | null;
  hasSolution: boolean;
};

type AddMistakesResult = {
  createdMistakes: Array<{
    recordId: string;
    problemId: string;
    mistakeId: string;
  }>;
  skippedRecords: Array<{
    recordId: string;
    problemId: string | null;
    reason:
      | "already_added"
      | "already_exists"
      | "not_not_mastered"
      | "missing_problem";
    mistakeId: string | null;
  }>;
};

export class StudentPracticeError extends Error {
  constructor(
    public code: StudentApiErrorCode,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export async function getPracticeOptions() {
  const supabase = await createClient();
  const [{ data: questionTypes, error: questionTypesError }, { data, error }] =
    await Promise.all([
      supabase
        .from("question_types")
        .select("id, level1, level2, level3")
        .eq("is_active", true)
        .order("level1", { ascending: true })
        .order("level2", { ascending: true })
        .order("level3", { ascending: true }),
      supabase
        .from("problems")
        .select("id, question_type_id")
        .not("question_type_id", "is", null)
    ]);

  if (questionTypesError) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `读取题型失败：${questionTypesError.message}`,
      500
    );
  }

  if (error) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `读取教师题库失败：${error.message}`,
      500
    );
  }

  const countMap = new Map<string, number>();

  for (const problem of (data ?? []) as Array<{ question_type_id: string | null }>) {
    if (!problem.question_type_id) {
      continue;
    }

    countMap.set(
      problem.question_type_id,
      (countMap.get(problem.question_type_id) ?? 0) + 1
    );
  }

  return {
    questionTypes: ((questionTypes ?? []) as QuestionTypeRow[]).map((item) => ({
      ...item,
      availableProblemCount: countMap.get(item.id) ?? 0
    })),
    questionCount: PRACTICE_QUESTION_COUNT
  };
}

export async function createPracticeSession({
  userId,
  questionTypeId
}: {
  userId: string;
  questionTypeId: string;
}) {
  if (!questionTypeId) {
    throw new StudentPracticeError(
      "VALIDATION_ERROR",
      "请先选择一个三级题型"
    );
  }

  const supabase = await createClient();
  const selectedQuestionType = await getQuestionTypeOrThrow(questionTypeId);
  const selectedProblems = await selectPracticeProblems({
    selectedQuestionType,
    targetCount: PRACTICE_QUESTION_COUNT
  });

  if (selectedProblems.length < PRACTICE_QUESTION_COUNT) {
    throw new StudentPracticeError(
      "VALIDATION_ERROR",
      "教师题库题量不足，暂时无法创建 5 题专项训练"
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: userId,
      question_type_id: questionTypeId,
      question_count: PRACTICE_QUESTION_COUNT,
      status: "active"
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `创建专项训练失败：${sessionError?.message ?? "unknown error"}`,
      500
    );
  }

  const { error: recordsError } = await supabase.from("practice_records").insert(
    selectedProblems.map((problem, index) => ({
      session_id: session.id,
      user_id: userId,
      problem_id: problem.id,
      question_type_id: problem.questionTypeId,
      position: index + 1,
      status: "pending"
    }))
  );

  if (recordsError) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `创建专项训练题目失败：${recordsError.message}`,
      500
    );
  }

  return getPracticeSession(userId, session.id);
}

export async function getPracticeSession(userId: string, sessionId: string) {
  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .select(
      "id, question_type_id, question_count, status, started_at, completed_at, question_types(id, level1, level2, level3)"
    )
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `读取专项训练失败：${sessionError.message}`,
      500
    );
  }

  if (!session) {
    throw new StudentPracticeError("NOT_FOUND", "专项训练不存在", 404);
  }

  const { data: records, error: recordsError } = await supabase
    .from("practice_records")
    .select(
      "id, position, status, result, answered_at, added_to_mistakes_at, created_mistake_id, problems(id, question_type_id, problem_type, raw_latex, answer, analysis, question_types(id, level1, level2, level3))"
    )
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (recordsError) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `读取专项训练题目失败：${recordsError.message}`,
      500
    );
  }

  return normalizePracticeSession(
    session as unknown as PracticeSessionRow,
    (records ?? []) as unknown as PracticeRecordRow[]
  );
}

export async function completePracticeRecord({
  userId,
  recordId,
  result
}: {
  userId: string;
  recordId: string;
  result: Exclude<PracticeResult, null>;
}) {
  if (result !== "mastered" && result !== "not_mastered") {
    throw new StudentPracticeError(
      "VALIDATION_ERROR",
      "训练结果只能是 mastered 或 not_mastered"
    );
  }

  const supabase = await createClient();
  const { data: record, error: recordError } = await supabase
    .from("practice_records")
    .select("id, session_id")
    .eq("id", recordId)
    .eq("user_id", userId)
    .maybeSingle();

  if (recordError) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `读取训练记录失败：${recordError.message}`,
      500
    );
  }

  if (!record) {
    throw new StudentPracticeError("NOT_FOUND", "训练记录不存在", 404);
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("practice_records")
    .update({
      status: "completed",
      result,
      answered_at: now
    })
    .eq("id", recordId)
    .eq("user_id", userId);

  if (updateError) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `更新训练记录失败：${updateError.message}`,
      500
    );
  }

  const { count, error: countError } = await supabase
    .from("practice_records")
    .select("id", { count: "exact", head: true })
    .eq("session_id", record.session_id)
    .eq("user_id", userId)
    .eq("status", "pending");

  if (countError) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `检查训练完成状态失败：${countError.message}`,
      500
    );
  }

  if ((count ?? 0) === 0) {
    const { error: sessionError } = await supabase
      .from("practice_sessions")
      .update({
        status: "completed",
        completed_at: now
      })
      .eq("id", record.session_id)
      .eq("user_id", userId);

    if (sessionError) {
      throw new StudentPracticeError(
        "SERVER_ERROR",
        `更新训练会话失败：${sessionError.message}`,
        500
      );
    }
  }

  return getPracticeSession(userId, record.session_id);
}

export async function addPracticeMistakes({
  userId,
  sessionId,
  recordIds
}: {
  userId: string;
  sessionId: string;
  recordIds: string[];
}): Promise<AddMistakesResult> {
  const uniqueRecordIds = Array.from(
    new Set(recordIds.map((id) => id.trim()).filter(Boolean))
  );

  if (uniqueRecordIds.length === 0) {
    throw new StudentPracticeError(
      "VALIDATION_ERROR",
      "请至少选择一道未掌握题目"
    );
  }

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `读取专项训练失败：${sessionError.message}`,
      500
    );
  }

  if (!session) {
    throw new StudentPracticeError("NOT_FOUND", "专项训练不存在", 404);
  }

  const { data: rows, error } = await supabase
    .from("practice_records")
    .select(
      "id, result, added_to_mistakes_at, created_mistake_id, problems(id, question_type_id, problem_type, raw_latex, answer, analysis, question_types(id, level1, level2, level3))"
    )
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .in("id", uniqueRecordIds)
    .order("position", { ascending: true });

  if (error) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `读取未掌握题目失败：${error.message}`,
      500
    );
  }

  if ((rows ?? []).length !== uniqueRecordIds.length) {
    throw new StudentPracticeError(
      "VALIDATION_ERROR",
      "存在不属于本次训练的题目记录"
    );
  }

  const result: AddMistakesResult = {
    createdMistakes: [],
    skippedRecords: []
  };

  for (const row of (rows ?? []) as unknown as PracticeRecordRow[]) {
    const problem = normalizeProblem(row.problems);

    if (row.result !== "not_mastered") {
      result.skippedRecords.push({
        recordId: row.id,
        problemId: problem?.id ?? null,
        reason: "not_not_mastered",
        mistakeId: null
      });
      continue;
    }

    if (!problem?.question_type_id) {
      result.skippedRecords.push({
        recordId: row.id,
        problemId: problem?.id ?? null,
        reason: "missing_problem",
        mistakeId: null
      });
      continue;
    }

    if (row.added_to_mistakes_at || row.created_mistake_id) {
      result.skippedRecords.push({
        recordId: row.id,
        problemId: problem.id,
        reason: "already_added",
        mistakeId: row.created_mistake_id
      });
      continue;
    }

    const source = getPracticeMistakeSource(problem.id);
    const { data: existingMistake, error: existingError } = await supabase
      .from("mistakes")
      .select("id")
      .eq("user_id", userId)
      .eq("source", source)
      .maybeSingle();

    if (existingError) {
      throw new StudentPracticeError(
        "SERVER_ERROR",
        `检查错题是否已存在失败：${existingError.message}`,
        500
      );
    }

    if (existingMistake) {
      await markRecordAddedToMistakes(row.id, userId, existingMistake.id);
      result.skippedRecords.push({
        recordId: row.id,
        problemId: problem.id,
        reason: "already_exists",
        mistakeId: existingMistake.id
      });
      continue;
    }

    const normalized = normalizeLatexProblem(problem.raw_latex).plainText;
    const stem = normalized || problem.raw_latex;
    const { data: mistake, error: insertError } = await supabase
      .from("mistakes")
      .insert({
        user_id: userId,
        question_type_id: problem.question_type_id,
        stem,
        problem_type: problem.problem_type,
        input_type: "latex",
        raw_text: stem,
        raw_latex: problem.raw_latex,
        normalized_stem: normalized || null,
        latex_content: problem.raw_latex,
        source,
        note: "专项训练未掌握题目加入错题库",
        answer: problem.answer,
        analysis: problem.analysis,
        classification_status: "student_selected",
        classified_by: "student"
      })
      .select("id")
      .single();

    if (insertError || !mistake) {
      throw new StudentPracticeError(
        "SERVER_ERROR",
        `加入错题库失败：${insertError?.message ?? "unknown error"}`,
        500
      );
    }

    await markRecordAddedToMistakes(row.id, userId, mistake.id);
    result.createdMistakes.push({
      recordId: row.id,
      problemId: problem.id,
      mistakeId: mistake.id
    });
  }

  return result;
}

async function getQuestionTypeOrThrow(questionTypeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_types")
    .select("id, level1, level2, level3")
    .eq("id", questionTypeId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `读取题型失败：${error.message}`,
      500
    );
  }

  if (!data) {
    throw new StudentPracticeError(
      "VALIDATION_ERROR",
      "请选择一个有效的三级题型"
    );
  }

  return data as QuestionTypeRow;
}

async function getCandidateProblems({
  questionTypeIds,
  excludeProblemIds,
  limit
}: {
  questionTypeIds: string[] | null;
  excludeProblemIds: Set<string>;
  limit: number;
}): Promise<CandidateProblem[]> {
  if (questionTypeIds && questionTypeIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const oversampleLimit = Math.max(limit * 5, 10);
  let query = supabase
    .from("problems")
    .select(
      "id, question_type_id, problem_type, raw_latex, answer, analysis, question_types(id, level1, level2, level3)"
    )
    .not("question_type_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(oversampleLimit);

  if (questionTypeIds) {
    query = query.in("question_type_id", questionTypeIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `读取教师题库失败：${error.message}`,
      500
    );
  }

  const candidates: CandidateProblem[] = [];

  for (const problem of (data ?? []) as unknown as ProblemRow[]) {
    const questionType = normalizeQuestionType(problem.question_types);

    if (!problem.question_type_id || !questionType) {
      continue;
    }

    candidates.push({
      id: problem.id,
      questionTypeId: problem.question_type_id,
      problemType: problem.problem_type,
      rawLatex: problem.raw_latex,
      answer: problem.answer,
      analysis: problem.analysis,
      questionType,
      hasSolution: hasContent(problem.answer) || hasContent(problem.analysis)
    });
  }

  return shuffle(
    candidates.filter((problem) => !excludeProblemIds.has(problem.id))
  )
    .sort((left, right) => Number(right.hasSolution) - Number(left.hasSolution))
    .slice(0, limit);
}

async function selectPracticeProblems({
  selectedQuestionType,
  targetCount
}: {
  selectedQuestionType: QuestionTypeRow;
  targetCount: number;
}) {
  const selected: CandidateProblem[] = [];
  const usedProblemIds = new Set<string>();
  const relatedQuestionTypes = await getRelatedQuestionTypes(selectedQuestionType);
  const sameSecondaryTypeIds = relatedQuestionTypes
    .filter(
      (questionType) =>
        questionType.id !== selectedQuestionType.id &&
        questionType.level2 === selectedQuestionType.level2
    )
    .map((questionType) => questionType.id);
  const sameLevelTypeIds = relatedQuestionTypes
    .filter(
      (questionType) =>
        questionType.id !== selectedQuestionType.id &&
        questionType.level2 !== selectedQuestionType.level2
    )
    .map((questionType) => questionType.id);

  await pickIntoSelection(
    [selectedQuestionType.id],
    selected,
    usedProblemIds,
    targetCount
  );

  await pickIntoSelection(
    sameSecondaryTypeIds,
    selected,
    usedProblemIds,
    targetCount
  );

  await pickIntoSelection(
    sameLevelTypeIds,
    selected,
    usedProblemIds,
    targetCount
  );

  await pickIntoSelection(null, selected, usedProblemIds, targetCount);

  return selected.slice(0, targetCount);
}

async function pickIntoSelection(
  questionTypeIds: string[] | null,
  selected: CandidateProblem[],
  usedProblemIds: Set<string>,
  targetCount: number
) {
  if (selected.length >= targetCount) {
    return;
  }

  const candidates = await getCandidateProblems({
    questionTypeIds,
    excludeProblemIds: usedProblemIds,
    limit: targetCount - selected.length
  });

  for (const problem of candidates) {
    if (selected.length >= targetCount) {
      break;
    }

    selected.push(problem);
    usedProblemIds.add(problem.id);
  }
}

async function getRelatedQuestionTypes(selectedQuestionType: QuestionTypeRow) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_types")
    .select("id, level1, level2, level3")
    .eq("is_active", true)
    .eq("level1", selectedQuestionType.level1);

  if (error) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `读取相近题型失败：${error.message}`,
      500
    );
  }

  return (data ?? []) as QuestionTypeRow[];
}

async function markRecordAddedToMistakes(
  recordId: string,
  userId: string,
  mistakeId: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("practice_records")
    .update({
      added_to_mistakes_at: new Date().toISOString(),
      created_mistake_id: mistakeId
    })
    .eq("id", recordId)
    .eq("user_id", userId);

  if (error) {
    throw new StudentPracticeError(
      "SERVER_ERROR",
      `更新训练记录失败：${error.message}`,
      500
    );
  }
}

function normalizePracticeSession(
  session: PracticeSessionRow,
  records: PracticeRecordRow[]
): PracticeSessionView {
  const sessionQuestionType = normalizeQuestionType(session.question_types);
  const normalizedRecords = records.map(normalizePracticeRecord);

  return {
    id: session.id,
    questionTypeId: session.question_type_id,
    questionCount: session.question_count,
    status: session.status,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    hasSupplementedProblems: normalizedRecords.some(
      (record) => record.problem?.questionType?.id !== session.question_type_id
    ),
    questionType: sessionQuestionType,
    records: normalizedRecords
  };
}

function normalizePracticeRecord(row: PracticeRecordRow): PracticeRecordView {
  const problem = normalizeProblem(row.problems);
  const questionType = normalizeQuestionType(problem?.question_types ?? null);

  return {
    id: row.id,
    position: row.position,
    status: row.status,
    result: row.result,
    answeredAt: row.answered_at,
    addedToMistakesAt: row.added_to_mistakes_at,
    createdMistakeId: row.created_mistake_id,
    problem: problem
      ? {
          id: problem.id,
          rawLatex: problem.raw_latex,
          displayLatex: problem.raw_latex,
          answer: problem.answer,
          analysis: problem.analysis,
          questionType: questionType
            ? {
                ...questionType,
                availableProblemCount: 0
              }
            : null
        }
      : null
  };
}

function normalizeProblem(value: ProblemRow | ProblemRow[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeQuestionType(value: QuestionTypeRow | QuestionTypeRow[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function getPracticeMistakeSource(problemId: string) {
  return `practice_problem:${problemId}`;
}

function hasContent(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function shuffle<T>(items: T[]) {
  return items
    .map((item) => ({ item, sortKey: Math.random() }))
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ item }) => item);
}
