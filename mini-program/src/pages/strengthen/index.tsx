import { useState } from "react";
import Taro from "@tarojs/taro";
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
  getStrengthenMockSamples
} from "../../data/latexRealSamples";
import "./index.scss";

const fallbackWeakTasks = [
  {
    id: "w1",
    source: "薄弱题型",
    type: "洛必达法则",
    latex: String.raw`\lim_{x \to 0} \frac{e^x-1-x}{x^2}`
  },
  {
    id: "w2",
    source: "薄弱题型",
    type: "导数定义",
    latex: String.raw`\lim_{\Delta x \to 0} \frac{f(x+\Delta x)-f(x)}{\Delta x}`
  },
  {
    id: "w3",
    source: "次薄弱题型",
    type: "定积分",
    latex: String.raw`\int_0^1 x\sqrt{1+x^2},dx`
  },
  {
    id: "w4",
    source: "随机挑战",
    type: "不定积分",
    latex: String.raw`\int \frac{1}{\sqrt{1-x^2}},dx`
  },
  {
    id: "w5",
    source: "随机挑战",
    type: "级数",
    latex: String.raw`\sum_{n=1}^{\infty} \frac{1}{n^2+1}`
  }
];

const weakTasks = ENABLE_LATEX_REAL_MOCK
  ? getStrengthenMockSamples().map((sample, index) => ({
      id: sample.id,
      source:
        index % 3 === 0
          ? "薄弱题型"
          : index % 3 === 1
            ? "次薄弱题型"
            : "随机挑战",
      type: sample.questionType,
      latex: getLatexRealContent(sample)
    }))
  : fallbackWeakTasks;

export default function StrengthenPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statuses, setStatuses] = useState<QuestionNavStatus[]>(
    weakTasks.map(() => "pending")
  );
  const current = weakTasks[currentIndex];
  const completedCount = statuses.filter((status) => status !== "pending").length;
  const progress = (completedCount / weakTasks.length) * 100;
  const allDone = completedCount === weakTasks.length;

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
      <AppTopBar title="薄弱巩固" rightText={`${completedCount}/${weakTasks.length}`} />

      <Card
        className="strengthen-practice-entry"
        onClick={() => Taro.navigateTo({ url: "/pages/practice/index" })}
      >
        <View>
          <Text className="strengthen-practice-title">专项训练</Text>
          <Text className="strengthen-practice-copy">
            按题型选择练习，巩固薄弱考点。
          </Text>
        </View>
        <Text className="strengthen-practice-arrow">›</Text>
      </Card>

      <View className="progress-summary">
        <View className="progress-summary-row">
          <Text className="progress-summary-title">
            第 {currentIndex + 1} 题 / 共 {weakTasks.length} 题
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
        notMasteredLabel="需巩固"
        onSelect={setCurrentIndex}
      />

      {allDone ? (
        <Card className="completion-card">
          <Text className="completion-title">薄弱巩固已完成</Text>
          <Text className="completion-copy">
            本页仅记录本地静态反馈，后续阶段再保存真实巩固结果。
          </Text>
        </Card>
      ) : (
        <Card className="question-card">
          <View className="question-card-header">
            <View className="question-card-tags">
              <StatusTag tone="warning">{current.source}</StatusTag>
              <StatusTag>{current.type}</StatusTag>
            </View>
          </View>
          <Text className="question-copy">
            查看题目与答案解析后，自主判断是否已经掌握。
          </Text>
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
            仍需巩固
          </SecondaryButton>
          <PrimaryButton onClick={() => markCurrent("mastered")}>
            已掌握
          </PrimaryButton>
        </View>
      ) : null}
    </View>
  );
}
