import { useState } from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { AppTopBar } from "../../../components/AppTopBar";
import { Card } from "../../../components/Card";
import { LatexRenderer } from "../../../components/LatexRenderer";
import {
  QuestionNavigator,
  type QuestionNavStatus
} from "../../../components/QuestionNavigator";
import { ProgressBar } from "../../../components/ProgressBar";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { SecondaryButton } from "../../../components/SecondaryButton";
import { StatusTag } from "../../../components/StatusTag";
import { ENABLE_LATEX_REAL_MOCK } from "../../../data/mockMode";
import {
  getLatexRealContent,
  getPracticeMockSamples
} from "../../../data/latexRealSamples";
import "./index.scss";

const fallbackSessionQuestions = [
  {
    id: "p1",
    type: "单选题",
    title: "第 1 题",
    stem: "判断导数定义中的增量形式。",
    latex: String.raw`\lim_{\Delta x \to 0} \frac{f(x_0+\Delta x)-f(x_0)}{\Delta x}`
  },
  {
    id: "p2",
    type: "填空题",
    title: "第 2 题",
    stem: "补全常见重要极限。",
    latex: String.raw`\lim_{x \to 0} \frac{\sin x}{x} = \blankbox`
  },
  {
    id: "p3",
    type: "计算题",
    title: "第 3 题",
    stem: "计算三角函数定积分。",
    latex: String.raw`\int_{0}^{\frac{\pi}{2}} \sin^{4}x \cos^{2}x , dx`
  },
  {
    id: "p4",
    type: "计算题",
    title: "第 4 题",
    stem: "计算带根号的不定积分。",
    latex: String.raw`\int \frac{x}{\sqrt{1+x^2}},dx`
  },
  {
    id: "p5",
    type: "单选题",
    title: "第 5 题",
    stem: "选择级数表达式的收敛判断。",
    latex: String.raw`\sum_{n=1}^{\infty} \frac{1}{n^{2}+1}`
  }
];

const typeLabelMap = {
  single_choice: "单选题",
  fill_blank: "填空题",
  subjective: "计算题",
  solution: "解析题"
};

const sessionQuestions = ENABLE_LATEX_REAL_MOCK
  ? getPracticeMockSamples().map((sample, index) => ({
      id: sample.id,
      type: typeLabelMap[sample.type],
      title: `第 ${index + 1} 题`,
      stem: `${sample.title} · ${sample.notes}`,
      latex: getLatexRealContent(sample)
    }))
  : fallbackSessionQuestions;

export default function PracticeSessionPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statuses, setStatuses] = useState<QuestionNavStatus[]>(
    sessionQuestions.map(() => "pending")
  );
  const current = sessionQuestions[currentIndex];
  const completedCount = statuses.filter((status) => status !== "pending").length;
  const progress = (completedCount / sessionQuestions.length) * 100;

  const markCurrent = (status: Exclude<QuestionNavStatus, "pending">) => {
    const next = statuses.map((item, index) =>
      index === currentIndex ? status : item
    );
    setStatuses(next);

    const nextPendingIndex = next.findIndex((item) => item === "pending");
    if (nextPendingIndex >= 0) {
      setCurrentIndex(nextPendingIndex);
      return;
    }

    Taro.navigateTo({ url: "/pages/practice/summary/index" });
  };

  return (
    <View className="page-shell page-stack learning-page">
      <AppTopBar
        title="专项训练"
        rightText={`第 ${currentIndex + 1} 题 / 共 ${sessionQuestions.length} 题`}
      />

      <ProgressBar percent={progress} />

      <QuestionNavigator
        statuses={statuses}
        currentIndex={currentIndex}
        onSelect={setCurrentIndex}
      />

      <Card className="question-card">
        <View className="question-card-header">
          <Text className="question-title">{current.title}</Text>
          <StatusTag tone="blue">{current.type}</StatusTag>
        </View>
        <Text className="question-copy">{current.stem}</Text>
        <LatexRenderer title="题目" latex={current.latex} mode="full" />
        <View className="answer-link">
          <Text className="answer-link-text">查看答案与解析</Text>
        </View>
      </Card>

      <View className="bottom-action-bar">
        <SecondaryButton tone="warning" onClick={() => markCurrent("not_mastered")}>
          未掌握
        </SecondaryButton>
        <PrimaryButton onClick={() => markCurrent("mastered")}>已掌握</PrimaryButton>
      </View>
    </View>
  );
}
