"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type CascadingQuestionTypeOption = {
  id: string;
  level1: string;
  level2: string;
  level3: string;
};

type CascadingQuestionTypeFiltersProps = {
  questionTypes: CascadingQuestionTypeOption[];
  selectedLevel1?: string;
  selectedLevel2?: string;
  selectedLevel3?: string;
  selectedQuestionTypeId?: string;
  hiddenQuestionTypeIdName?: string;
  disableLegacyFields?: boolean;
  className?: string;
  onChange?: (value: {
    level1: string;
    level2: string;
    level3: string;
    questionTypeId: string;
  }) => void;
};

export function CascadingQuestionTypeFilters({
  questionTypes,
  selectedLevel1 = "",
  selectedLevel2 = "",
  selectedLevel3 = "",
  selectedQuestionTypeId = "",
  hiddenQuestionTypeIdName,
  disableLegacyFields = false,
  className = "grid gap-4 md:grid-cols-3",
  onChange
}: CascadingQuestionTypeFiltersProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = useMemo(
    () =>
      normalizeSelection({
        questionTypes,
        level1: selectedLevel1,
        level2: selectedLevel2,
        level3: selectedLevel3,
        questionTypeId: selectedQuestionTypeId
      }),
    [questionTypes, selectedLevel1, selectedLevel2, selectedLevel3, selectedQuestionTypeId]
  );
  const [level1, setLevel1] = useState(initial.level1);
  const [level2, setLevel2] = useState(initial.level2);
  const [level3, setLevel3] = useState(initial.level3);
  const selectedQuestionType = findSelectedQuestionType(questionTypes, {
    level1,
    level2,
    level3
  });

  useEffect(() => {
    if (!disableLegacyFields || !rootRef.current) {
      return;
    }

    const form = rootRef.current.closest("form");

    if (!form) {
      return;
    }

    const legacyFields = form.querySelectorAll<
      HTMLSelectElement | HTMLInputElement
    >(
      [
        "[name='level1']",
        "[name='level2']",
        "[name='questionTypeId']"
      ].join(",")
    );

    legacyFields.forEach((field) => {
      if (rootRef.current?.contains(field)) {
        return;
      }

      field.disabled = true;
      const wrapper = field.closest("label");

      if (wrapper instanceof HTMLElement) {
        wrapper.hidden = true;
      }
    });
  }, [disableLegacyFields]);

  const level1Options = useMemo(
    () => unique(questionTypes.map((item) => item.level1)),
    [questionTypes]
  );
  const level2Options = useMemo(
    () =>
      unique(
        questionTypes
          .filter((item) => !level1 || item.level1 === level1)
          .map((item) => item.level2)
      ),
    [questionTypes, level1]
  );
  const level3Options = useMemo(
    () =>
      questionTypes.filter(
        (item) =>
          (!level1 || item.level1 === level1) &&
          (!level2 || item.level2 === level2)
      ),
    [questionTypes, level1, level2]
  );

  function emit(nextLevel1: string, nextLevel2: string, nextLevel3: string) {
    const nextQuestionType = findSelectedQuestionType(questionTypes, {
      level1: nextLevel1,
      level2: nextLevel2,
      level3: nextLevel3
    });

    onChange?.({
      level1: nextLevel1,
      level2: nextLevel2,
      level3: nextLevel3,
      questionTypeId: nextQuestionType?.id ?? ""
    });
  }

  function handleLevel1Change(nextLevel1: string) {
    const nextLevel2 = belongsToLevel1(questionTypes, nextLevel2Value(level2), nextLevel1)
      ? level2
      : "";
    const nextLevel3 = belongsToPath(questionTypes, level3, nextLevel1, nextLevel2)
      ? level3
      : "";

    setLevel1(nextLevel1);
    setLevel2(nextLevel2);
    setLevel3(nextLevel3);
    emit(nextLevel1, nextLevel2, nextLevel3);
  }

  function handleLevel2Change(nextLevel2: string) {
    const nextLevel3 = belongsToPath(questionTypes, level3, level1, nextLevel2)
      ? level3
      : "";

    setLevel2(nextLevel2);
    setLevel3(nextLevel3);
    emit(level1, nextLevel2, nextLevel3);
  }

  function handleLevel3Change(nextLevel3: string) {
    setLevel3(nextLevel3);
    emit(level1, level2, nextLevel3);
  }

  return (
    <div ref={rootRef} className={className}>
      <label className="block text-sm font-medium text-ink">
        一级分类
        <select
          name="level1"
          value={level1}
          onChange={(event) => handleLevel1Change(event.target.value)}
          className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
        >
          <option value="">全部</option>
          {level1Options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-ink">
        二级分类
        <select
          name="level2"
          value={level2}
          onChange={(event) => handleLevel2Change(event.target.value)}
          className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
        >
          <option value="">全部</option>
          {level2Options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-ink">
        三级题型
        <select
          name="level3"
          value={level3}
          onChange={(event) => handleLevel3Change(event.target.value)}
          className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
        >
          <option value="">全部</option>
          {level3Options.map((questionType) => (
            <option key={questionType.id} value={questionType.level3}>
              {questionType.level3}
            </option>
          ))}
        </select>
      </label>

      {hiddenQuestionTypeIdName ? (
        <input
          type="hidden"
          name={hiddenQuestionTypeIdName}
          value={selectedQuestionType?.id ?? ""}
        />
      ) : null}
    </div>
  );
}

function normalizeSelection({
  questionTypes,
  level1,
  level2,
  level3,
  questionTypeId
}: {
  questionTypes: CascadingQuestionTypeOption[];
  level1: string;
  level2: string;
  level3: string;
  questionTypeId: string;
}) {
  const matchedById = questionTypeId
    ? questionTypes.find((item) => item.id === questionTypeId)
    : null;
  const nextLevel1 = matchedById?.level1 ?? level1;
  const nextLevel2 =
    matchedById?.level2 ??
    (belongsToLevel1(questionTypes, level2, nextLevel1) ? level2 : "");
  const nextLevel3 =
    matchedById?.level3 ??
    (belongsToPath(questionTypes, level3, nextLevel1, nextLevel2) ? level3 : "");

  return {
    level1: nextLevel1,
    level2: nextLevel2,
    level3: nextLevel3
  };
}

function findSelectedQuestionType(
  questionTypes: CascadingQuestionTypeOption[],
  selection: { level1: string; level2: string; level3: string }
) {
  if (!selection.level3) {
    return null;
  }

  return (
    questionTypes.find(
      (item) =>
        item.level3 === selection.level3 &&
        (!selection.level1 || item.level1 === selection.level1) &&
        (!selection.level2 || item.level2 === selection.level2)
    ) ?? null
  );
}

function belongsToLevel1(
  questionTypes: CascadingQuestionTypeOption[],
  level2: string,
  level1: string
) {
  if (!level2) {
    return true;
  }

  return questionTypes.some(
    (item) => item.level2 === level2 && (!level1 || item.level1 === level1)
  );
}

function belongsToPath(
  questionTypes: CascadingQuestionTypeOption[],
  level3: string,
  level1: string,
  level2: string
) {
  if (!level3) {
    return true;
  }

  return questionTypes.some(
    (item) =>
      item.level3 === level3 &&
      (!level1 || item.level1 === level1) &&
      (!level2 || item.level2 === level2)
  );
}

function nextLevel2Value(value: string) {
  return value;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
