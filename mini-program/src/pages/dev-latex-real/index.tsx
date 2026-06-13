import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "@tarojs/components";
import {
  getLatexDebugInfo,
  LatexRenderer,
  type LatexDebugInfo
} from "../../components/LatexRenderer";
import { ENABLE_LATEX_REAL_MOCK } from "../../data/mockMode";
import {
  getLatexRealContent,
  latexRealSamples,
  type LatexRealSample
} from "../../data/latexRealSamples";
import "./index.scss";

type FilterKind = "all" | "type" | "questionType" | "difficulty";

type FilterOption = {
  label: string;
  kind: FilterKind;
  value: string;
};

const typeLabels: Record<string, string> = {
  single_choice: "选择题",
  fill_blank: "填空题",
  subjective: "计算题",
  solution: "答案解析"
};

export default function DevLatexRealPage() {
  const [filter, setFilter] = useState<FilterOption>({
    label: "全部",
    kind: "all",
    value: "all"
  });
  const [selectedId, setSelectedId] = useState(latexRealSamples[0]?.id ?? "");

  const filterOptions = useMemo(() => buildFilterOptions(), []);
  const visibleSamples = latexRealSamples.filter((sample) =>
    matchFilter(sample, filter)
  );
  const selected =
    visibleSamples.find((sample) => sample.id === selectedId) ??
    visibleSamples[0] ??
    latexRealSamples[0];

  return (
    <View className="dev-latex-page">
      <View className="dev-latex-header">
        <Text className="dev-latex-title">真实 LaTeX 业务样例</Text>
        <Text className="dev-latex-subtitle">
          mock 验收模式：{ENABLE_LATEX_REAL_MOCK ? "已开启" : "已关闭"} · 共{" "}
          {latexRealSamples.length} 条
        </Text>
      </View>

      <ScrollView scrollX className="dev-latex-filter-scroll">
        <View className="dev-latex-filters">
          {filterOptions.map((option) => (
            <Text
              key={`${option.kind}-${option.value}`}
              className={`dev-latex-filter ${
                filter.kind === option.kind && filter.value === option.value
                  ? "dev-latex-filter-active"
                  : ""
              }`}
              onClick={() => setFilter(option)}
            >
              {option.label}
            </Text>
          ))}
        </View>
      </ScrollView>

      <View className="dev-latex-layout">
        <View className="dev-latex-list">
          <Text className="dev-latex-section-title">
            当前 {visibleSamples.length} 条
          </Text>
          {visibleSamples.map((sample) => (
            <View
              key={sample.id}
              className={`dev-latex-list-item ${
                selected.id === sample.id ? "dev-latex-list-item-active" : ""
              }`}
              onClick={() => setSelectedId(sample.id)}
            >
              <View className="dev-latex-list-head">
                <Text className="dev-latex-list-title">{sample.title}</Text>
                <Text className="dev-latex-list-badge">
                  {typeLabels[sample.type]}
                </Text>
              </View>
              <Text className="dev-latex-list-meta">
                {sample.questionType} · {sample.difficulty}
              </Text>
              <LatexRenderer latex={getLatexRealContent(sample)} mode="preview" />
            </View>
          ))}
        </View>

        {selected ? (
          <View className="dev-latex-detail">
            <View className="dev-latex-detail-card">
              <Text className="dev-latex-detail-title">{selected.title}</Text>
              <Text className="dev-latex-detail-meta">
                {typeLabels[selected.type]} · {selected.questionType} ·{" "}
                {selected.difficulty}
              </Text>
              <Text className="dev-latex-notes">{selected.notes}</Text>

              <View className="dev-latex-block">
                <Text className="dev-latex-block-title">题干 / 选项</Text>
                <LatexRenderer
                  title={selected.title}
                  latex={getLatexRealContent(selected)}
                  mode="full"
                />
                <DebugBlock
                  title="题干 / 选项调试"
                  content={getLatexRealContent(selected)}
                />
              </View>

              <View className="dev-latex-block">
                <Text className="dev-latex-block-title">答案</Text>
                <LatexRenderer latex={selected.answer} mode="full" />
                <DebugBlock title="答案调试" content={selected.answer} />
              </View>

              <View className="dev-latex-block">
                <Text className="dev-latex-block-title">解析</Text>
                <LatexRenderer latex={selected.analysis} mode="full" />
                <DebugBlock title="解析调试" content={selected.analysis} />
              </View>

              <View className="dev-latex-tags">
                {selected.tags.map((tag) => (
                  <Text key={tag} className="dev-latex-tag">
                    {tag}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function buildFilterOptions(): FilterOption[] {
  const types = unique(latexRealSamples.map((sample) => sample.type)).map((type) => ({
    label: typeLabels[type],
    kind: "type" as const,
    value: type
  }));
  const questionTypes = unique(
    latexRealSamples.map((sample) => sample.questionType)
  ).map((questionType) => ({
    label: questionType,
    kind: "questionType" as const,
    value: questionType
  }));
  const difficulties = unique(
    latexRealSamples.map((sample) => sample.difficulty)
  ).map((difficulty) => ({
    label: difficulty,
    kind: "difficulty" as const,
    value: difficulty
  }));

  return [
    { label: "全部", kind: "all", value: "all" },
    ...types,
    ...questionTypes,
    ...difficulties
  ];
}

function matchFilter(sample: LatexRealSample, filter: FilterOption) {
  if (filter.kind === "all") {
    return true;
  }

  return sample[filter.kind] === filter.value;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function DebugBlock({ title, content }: { title: string; content: string }) {
  const debug = useMemo(() => getLatexDebugInfo(content), [content]);

  return (
    <View className="dev-latex-debug">
      <View className="dev-latex-debug-header">
        <Text className="dev-latex-debug-title">{title}</Text>
        <Text className={`dev-latex-debug-status dev-latex-debug-${debug.status}`}>
          {debug.status}
        </Text>
      </View>
      <DebugText label="raw" value={debug.raw} />
      <DebugText label="normalized" value={debug.normalized} />
      <DebugText
        label="segments"
        value={formatDebugSegments(debug)}
      />
    </View>
  );
}

function DebugText({ label, value }: { label: string; value: string }) {
  return (
    <View className="dev-latex-debug-row">
      <Text className="dev-latex-debug-label">{label}</Text>
      <ScrollView scrollX className="dev-latex-debug-scroll">
        <View className="dev-latex-debug-inner">
          <Text className="dev-latex-debug-text">{value || "(empty)"}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function formatDebugSegments(debug: LatexDebugInfo) {
  return JSON.stringify(
    debug.segments.map((segment) => ({
      type: segment.type,
      displayMode: segment.displayMode,
      raw: segment.raw,
      katexContent: segment.katexContent,
      error: segment.error,
      choices: segment.choices
    })),
    null,
    2
  );
}
