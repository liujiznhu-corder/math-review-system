import { useState } from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { AppTopBar } from "../../components/AppTopBar";
import { Card } from "../../components/Card";
import { ProgressBar } from "../../components/ProgressBar";
import { PrimaryButton } from "../../components/PrimaryButton";
import { StatusTag } from "../../components/StatusTag";
import "./index.scss";

type PracticeType = {
  id: string;
  name: string;
  count: number;
  mastery: number;
};

const categories: Array<{
  id: string;
  name: string;
  items: PracticeType[];
}> = [
  {
    id: "single",
    name: "一元函数微积分",
    items: [
      { id: "derivative", name: "导数定义", count: 42, mastery: 45 },
      { id: "lhospital", name: "洛必达法则", count: 36, mastery: 52 },
      { id: "indefinite", name: "不定积分", count: 58, mastery: 61 },
      { id: "definite", name: "定积分", count: 49, mastery: 68 }
    ]
  },
  {
    id: "multi",
    name: "多元函数微积分",
    items: [
      { id: "partial", name: "偏导数计算", count: 28, mastery: 57 },
      { id: "extreme", name: "多元函数极值", count: 20, mastery: 49 }
    ]
  },
  {
    id: "ode",
    name: "常微分方程",
    items: [
      { id: "separable", name: "可分离变量方程", count: 18, mastery: 72 },
      { id: "linear", name: "一阶线性方程", count: 24, mastery: 66 }
    ]
  }
];

export default function PracticePage() {
  const [openCategoryId, setOpenCategoryId] = useState(categories[0].id);
  const [selectedTypeId, setSelectedTypeId] = useState("");

  const startPractice = () => {
    if (!selectedTypeId) {
      return;
    }
    Taro.navigateTo({ url: "/pages/practice/session/index" });
  };

  return (
    <View className="page-shell practice-page">
      <View className="page-stack">
        <AppTopBar title="专项训练" />

        <View className="practice-heading">
          <Text className="practice-subject">高等数学</Text>
          <StatusTag tone="blue">专升本真题库</StatusTag>
        </View>

        <View className="practice-category-list">
          {categories.map((category) => {
            const isOpen = openCategoryId === category.id;
            return (
              <Card key={category.id} className="practice-category-card">
                <View
                  className="practice-category-header"
                  onClick={() =>
                    setOpenCategoryId(isOpen ? "" : category.id)
                  }
                >
                  <Text className="practice-category-title">{category.name}</Text>
                  <Text className="practice-category-arrow">
                    {isOpen ? "⌃" : "⌄"}
                  </Text>
                </View>

                {isOpen ? (
                  <View className="practice-type-list">
                    {category.items.map((item) => {
                      const selected = selectedTypeId === item.id;
                      return (
                        <View
                          key={item.id}
                          className={`practice-type-card ${
                            selected ? "practice-type-card-selected" : ""
                          }`}
                          onClick={() => setSelectedTypeId(item.id)}
                        >
                          <View className="practice-type-top">
                            <Text className="practice-type-name">{item.name}</Text>
                            <StatusTag
                              tone={item.mastery < 55 ? "warning" : "primary"}
                            >
                              {item.mastery}% 掌握度
                            </StatusTag>
                          </View>
                          <Text className="practice-type-count">
                            {item.count} 题可练
                          </Text>
                          <ProgressBar
                            percent={item.mastery}
                            tone={item.mastery < 55 ? "warning" : "primary"}
                          />
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      </View>

      <View className="bottom-action-bar bottom-action-bar-single">
        <PrimaryButton disabled={!selectedTypeId} onClick={startPractice}>
          开始训练
        </PrimaryButton>
      </View>
    </View>
  );
}
