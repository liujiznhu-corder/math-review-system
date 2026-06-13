import { useMemo, useState } from "react";
import { View, Text } from "@tarojs/components";
import {
  getLatexRenderStatus,
  LatexRenderer,
  type LatexRenderStatus
} from "../../components/LatexRenderer";
import {
  latexSampleCategories,
  latexSamples,
  type LatexSampleCategory
} from "../../data/latexSamples";
import "./index.scss";

type FilterValue = "all" | LatexRenderStatus | LatexSampleCategory;

const statusFilters: FilterValue[] = ["all", "error", "fallback"];

export default function LatexPocPage() {
  const [filter, setFilter] = useState<FilterValue>("all");

  const samplesWithStatus = useMemo(
    () =>
      latexSamples.map((sample) => ({
        ...sample,
        status: getLatexRenderStatus(sample.latex)
      })),
    []
  );

  const visibleSamples = samplesWithStatus.filter((sample) => {
    if (filter === "all") {
      return true;
    }

    if (filter === "error" || filter === "fallback" || filter === "success") {
      return sample.status === filter;
    }

    return sample.category === filter;
  });

  return (
    <View className="latex-poc-page">
      <View className="latex-poc-header">
        <Text className="latex-poc-title">LatexRenderer 测试</Text>
        <Text className="latex-poc-subtitle">
          固定样例验证，不接数据库，不调用后端 API；可通过编译模式直接打开
          pages/latex-poc/index
        </Text>
      </View>

      <View className="latex-poc-filters">
        {statusFilters.map((item) => (
          <Text
            key={item}
            className={`latex-poc-filter ${
              filter === item ? "latex-poc-filter-active" : ""
            }`}
            onClick={() => setFilter(item)}
          >
            {getFilterLabel(item)}
          </Text>
        ))}
        {latexSampleCategories.map((category) => (
          <Text
            key={category}
            className={`latex-poc-filter ${
              filter === category ? "latex-poc-filter-active" : ""
            }`}
            onClick={() => setFilter(category)}
          >
            {category}
          </Text>
        ))}
      </View>

      <View className="latex-poc-note">
        <Text>
          full 模式使用 @rojer/katex-mini 生成小程序 rich-text nodes；preview
          模式只输出纯文本摘要。四选项会拆成独立布局；连续的文本、公式和填空线会进入同一个
          inline-flow，避免填空线掉到独立 block。
        </Text>
      </View>

      <Text className="latex-poc-count">
        当前显示 {visibleSamples.length} / {latexSamples.length} 个样例
      </Text>

      {visibleSamples.map((sample) => (
        <LatexRenderer
          key={sample.id}
          title={sample.title}
          category={`${sample.category} · ${sample.status}`}
          description={sample.description}
          acceptance={`状态：${sample.status}\n人工验收点：${sample.notes}\n${sample.acceptance}`}
          latex={sample.latex}
          mode="full"
        />
      ))}
    </View>
  );
}

function getFilterLabel(filter: FilterValue) {
  if (filter === "all") {
    return "全部";
  }

  return filter;
}
