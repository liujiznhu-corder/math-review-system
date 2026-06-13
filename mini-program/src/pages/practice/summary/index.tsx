import { useState } from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { AppTopBar } from "../../../components/AppTopBar";
import { Card } from "../../../components/Card";
import { LatexRenderer } from "../../../components/LatexRenderer";
import { MetricCard } from "../../../components/MetricCard";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { SecondaryButton } from "../../../components/SecondaryButton";
import { StatusTag } from "../../../components/StatusTag";
import "./index.scss";

const notMasteredQuestions = [
  {
    id: "p2",
    title: "第 2 题",
    latex: String.raw`\lim_{x \to 0} \frac{\sin x}{x} = \_\_\_`
  },
  {
    id: "p4",
    title: "第 4 题",
    latex: String.raw`\int \frac{x}{\sqrt{1+x^2}},dx`
  }
];

export default function PracticeSummaryPage() {
  const [selectedIds, setSelectedIds] = useState(
    notMasteredQuestions.map((item) => item.id)
  );
  const allSelected = selectedIds.length === notMasteredQuestions.length;

  const toggleQuestion = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : notMasteredQuestions.map((item) => item.id));
  };

  const addSelectedMistakes = () => {
    Taro.showToast({
      title: selectedIds.length > 0 ? "已模拟加入错题库" : "请先选择题目",
      icon: selectedIds.length > 0 ? "success" : "none"
    });
  };

  return (
    <View className="page-shell practice-summary-page">
      <View className="page-stack">
        <AppTopBar title="训练完成" leftText="✓" rightText="Done" />

        <Card className="summary-card">
          <View className="summary-check">
            <Text className="summary-check-text">✓</Text>
          </View>
          <Text className="summary-title">本次练习总结</Text>
          <View className="summary-metrics">
            <MetricCard label="总题数" value={5} tone="primary" />
            <MetricCard label="已掌握" value={3} />
            <MetricCard label="待复习" value={2} tone="warning" />
          </View>
        </Card>

        <View>
          <View className="section-title-row">
            <Text className="section-title">
              未掌握题目（{notMasteredQuestions.length}）
            </Text>
            <Text className="section-action" onClick={toggleAll}>
              {allSelected ? "取消全选" : "全选"}
            </Text>
          </View>

          <View className="summary-question-list">
            {notMasteredQuestions.map((item) => {
              const selected = selectedIds.includes(item.id);
              return (
                <Card key={item.id} className="summary-question-card">
                  <View className="summary-question-header">
                    <View
                      className={`summary-checkbox ${
                        selected ? "summary-checkbox-selected" : ""
                      }`}
                      onClick={() => toggleQuestion(item.id)}
                    >
                      <Text className="summary-checkbox-mark">
                        {selected ? "✓" : ""}
                      </Text>
                    </View>
                    <Text className="summary-question-title">{item.title}</Text>
                    <StatusTag tone="warning">未掌握</StatusTag>
                  </View>
                  <LatexRenderer
                    title="题目"
                    latex={item.latex}
                    mode="preview"
                  />
                </Card>
              );
            })}
          </View>
        </View>

        <Card className="advice-card">
          <Text className="advice-icon">!</Text>
          <View className="advice-copy">
            <Text className="advice-title">训练建议</Text>
            <Text className="advice-text">
              温故而知新，多复盘错题是提分的关键。建议针对未掌握题目进行针对性训练。
            </Text>
          </View>
        </Card>

        <View className="summary-actions">
          <PrimaryButton onClick={addSelectedMistakes}>
            加入选中的错题库
          </PrimaryButton>
          <SecondaryButton
            onClick={() => Taro.navigateTo({ url: "/pages/practice/index" })}
          >
            再练一次
          </SecondaryButton>
          <Text
            className="summary-home-link"
            onClick={() => Taro.switchTab({ url: "/pages/home/index" })}
          >
            返回首页
          </Text>
        </View>
      </View>
    </View>
  );
}
