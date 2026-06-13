import { Text, View } from "@tarojs/components";
import "./index.scss";

export const tabBarItems = [
  { text: "首页", pagePath: "pages/home/index" },
  { text: "复习", pagePath: "pages/review/index" },
  { text: "巩固", pagePath: "pages/strengthen/index" },
  { text: "错题", pagePath: "pages/mistake/index" },
  { text: "我的", pagePath: "pages/profile/index" }
] as const;

type StaticTabBarProps = {
  activeText?: string;
};

export function StaticTabBar({ activeText = "首页" }: StaticTabBarProps) {
  return (
    <View className="static-tab-bar">
      {tabBarItems.map((item) => (
        <View
          key={item.pagePath}
          className={`static-tab-item ${
            item.text === activeText ? "static-tab-item-active" : ""
          }`}
        >
          <View className="static-tab-dot" />
          <Text className="static-tab-text">{item.text}</Text>
        </View>
      ))}
    </View>
  );
}
