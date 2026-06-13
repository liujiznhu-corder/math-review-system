import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { BrandHeader } from "../../components/BrandHeader";
import { Card } from "../../components/Card";
import { MetricCard } from "../../components/MetricCard";
import "./index.scss";

const quickActions = [
  { title: "录入错题", hint: "粘贴 LaTeX" },
  {
    title: "今日复习",
    hint: "按期巩固",
    url: "/pages/review/index",
    tab: true
  },
  {
    title: "薄弱巩固",
    hint: "每日 5 题",
    url: "/pages/strengthen/index",
    tab: true
  },
  { title: "专项训练", hint: "按题型练", url: "/pages/practice/index" }
];

const weakPoints = [
  { name: "导数定义", mastery: 45 },
  { name: "等价无穷小", mastery: 52 },
  { name: "洛必达法则", mastery: 58 },
  { name: "定积分计算", mastery: 63 },
  { name: "矩阵初等变换", mastery: 68 }
];

const sevenDayStats = [
  { label: "新增错题", value: 8 },
  { label: "完成复习", value: 21 },
  { label: "专项训练", value: 15 },
  { label: "薄弱巩固", value: 10 }
];

export default function HomePage() {
  const openQuickAction = (url?: string, tab?: boolean) => {
    if (!url) {
      Taro.showToast({ title: "后续阶段开放", icon: "none" });
      return;
    }

    if (tab) {
      Taro.switchTab({ url });
      return;
    }

    Taro.navigateTo({ url });
  };

  return (
    <View className="page-shell home-page">
      <View className="page-stack">
        <BrandHeader />

        <Card className="countdown-card">
          <Text className="countdown-title">江苏专转本数学考试倒计时</Text>
          <View className="countdown-days-row">
            <Text className="countdown-days">281</Text>
            <Text className="countdown-unit">天</Text>
          </View>
          <Text className="countdown-date">距离 2027年3月21日</Text>
          <View className="countdown-divider" />
          <Text className="countdown-quote">
            今天多复盘一道错题，考场上就少一个失分点。
          </Text>
        </Card>

        <View className="quick-grid">
          {quickActions.map((item) => (
            <Card
              key={item.title}
              className="quick-card"
              onClick={() => openQuickAction(item.url, item.tab)}
            >
              <Text className="quick-title">{item.title}</Text>
              <Text className="quick-hint">{item.hint}</Text>
            </Card>
          ))}
        </View>

        <Card className="review-card">
          <View className="review-card-copy">
            <Text className="review-card-title">今日待复习</Text>
            <Text className="review-card-desc">包含 6 道错题，4 个概念</Text>
          </View>
          <View className="review-card-action">
            <Text className="review-card-number">6</Text>
            <View className="review-card-arrow">
              <Text className="review-card-arrow-text">›</Text>
            </View>
          </View>
        </Card>

        <View className="status-grid">
          <MetricCard label="薄弱巩固 · 需关注" value={5} tone="warning" />
          <Card
            className="practice-status-card"
            onClick={() => Taro.navigateTo({ url: "/pages/practice/index" })}
          >
            <Text className="practice-status-label">专项训练 · 未开始</Text>
            <Text className="practice-status-value">开始</Text>
          </Card>
        </View>

        <View>
          <View className="section-title-row">
            <Text className="section-title">薄弱考点 Top 5</Text>
            <Text className="section-action">查看全部</Text>
          </View>
          <Card className="weak-list-card">
            {weakPoints.map((item) => (
              <View key={item.name} className="weak-row">
                <View className="weak-row-top">
                  <Text className="weak-name">{item.name}</Text>
                  <Text className="weak-percent">{item.mastery}%</Text>
                </View>
                <View className="weak-progress-track">
                  <View
                    className="weak-progress-fill"
                    style={{ width: `${item.mastery}%` }}
                  />
                </View>
              </View>
            ))}
          </Card>
        </View>

        <View>
          <View className="section-title-row">
            <Text className="section-title">近 7 日学习数据</Text>
          </View>
          <View className="stats-grid">
            {sevenDayStats.map((item, index) => (
              <MetricCard
                key={item.label}
                label={item.label}
                value={item.value}
                tone={index === 0 ? "primary" : "default"}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
