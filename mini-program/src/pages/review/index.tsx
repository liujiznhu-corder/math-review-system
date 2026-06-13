import { useState } from "react";
import { Text, View } from "@tarojs/components";
import { AppTopBar } from "../../components/AppTopBar";
import { Card } from "../../components/Card";
import { LatexRenderer } from "../../components/LatexRenderer";
import {
  QuestionNavigator,
  type QuestionNavStatus
} from "../../components/QuestionNavigator";
import { ProgressBar } from "../../components/ProgressBar";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SecondaryButton } from "../../components/SecondaryButton";
import { StatusTag } from "../../components/StatusTag";
import { ENABLE_LATEX_REAL_MOCK } from "../../data/mockMode";
import {
  getLatexRealContent,
  getReviewMockSamples
} from "../../data/latexRealSamples";
import "./index.scss";

const fallbackReviewTasks = [
  {
    id: "r1",
    type: "导数计算",
    round: "Day 3",
    stem: "已知函数在一点处可导，判断导数定义式的变形。",
    latex: String.raw`\lim_{x \to 0} \frac{f(1+x)-f(1)}{x}`
  },
  {
    id: "r2",
    type: "等价无穷小",
    round: "Day 7",
    stem: "计算极限并识别常用等价替换。",
    latex: String.raw`\lim_{x \to 0} \frac{\sin x - x + \frac{x^{3}}{6}}{x^{5}}`
  },
  {
    id: "r3",
    type: "不定积分",
    round: "Day 14",
    stem: "选择合适换元法完成不定积分。",
    latex: String.raw`\int \frac{2x}{1+x^2} , dx`
  },
  {
    id: "r4",
    type: "定积分",
    round: "Day 30",
    stem: "复习三角函数幂次积分。",
    latex: String.raw`\int_{0}^{\frac{\pi}{2}} \sin^{4}x \cos^{2}x , dx`
  }
];

const reviewTasks = ENABLE_LATEX_REAL_MOCK
  ? getReviewMockSamples().map((sample, index) => ({
      id: sample.id,
      type: sample.questionType,
      round: `Day ${index + 1}`,
      stem: sample.notes,
      latex: getLatexRealContent(sample)
    }))
  : fallbackReviewTasks;

export default function ReviewPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statuses, setStatuses] = useState<QuestionNavStatus[]>(
    reviewTasks.map(() => "pending")
  );
  const current = reviewTasks[currentIndex];
  const completedCount = statuses.filter((status) => status !== "pending").length;
  const progress = (completedCount / reviewTasks.length) * 100;
  const allDone = completedCount === reviewTasks.length;

  const markCurrent = (status: Exclude<QuestionNavStatus, "pending">) => {
    const next = statuses.map((item, index) =>
      index === currentIndex ? status : item
    );
    setStatuses(next);

    const nextPendingIndex = next.findIndex((item) => item === "pending");
    if (nextPendingIndex >= 0) {
      setCurrentIndex(nextPendingIndex);
    }
  };

  return (
    <View className="page-shell page-stack learning-page">
      <AppTopBar title="今日复习" />

      <View className="progress-summary">
        <View className="progress-summary-row">
          <Text className="progress-summary-title">
            第 {currentIndex + 1} 题 / 共 {reviewTasks.length} 题
          </Text>
          <Text className="progress-summary-percent">
            {Math.round(progress)}%
          </Text>
        </View>
        <ProgressBar percent={progress} />
      </View>

      <QuestionNavigator
        statuses={statuses}
        currentIndex={currentIndex}
        onSelect={setCurrentIndex}
      />

      {allDone ? (
        <Card className="completion-card">
          <Text className="completion-title">今日复习已完成</Text>
          <Text className="completion-copy">
            复习结果已在本地静态状态中更新，后续阶段再接入真实保存。
          </Text>
        </Card>
      ) : (
        <Card className="question-card">
          <View className="question-card-header">
            <View className="question-card-tags">
              <StatusTag>{current.type}</StatusTag>
              <StatusTag tone="blue">{current.round}</StatusTag>
            </View>
            <StatusTag tone="muted">收藏</StatusTag>
          </View>
          <Text className="question-copy">{current.stem}</Text>
          <LatexRenderer title="题目" latex={current.latex} mode="full" />
          <View className="answer-link">
            <Text className="answer-link-text">查看答案与解析</Text>
          </View>
        </Card>
      )}

      {!allDone ? (
        <View className="bottom-action-bar">
          <SecondaryButton
            tone="warning"
            onClick={() => markCurrent("not_mastered")}
          >
            未掌握
          </SecondaryButton>
          <PrimaryButton onClick={() => markCurrent("mastered")}>
            已掌握
          </PrimaryButton>
        </View>
      ) : null}
    </View>
  );
}
