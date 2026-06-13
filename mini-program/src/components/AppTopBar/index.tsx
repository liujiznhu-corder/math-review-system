import { Text, View } from "@tarojs/components";
import "./index.scss";

type AppTopBarProps = {
  title: string;
  rightText?: string;
  leftText?: string;
};

export function AppTopBar({
  title,
  rightText = "···",
  leftText = "‹"
}: AppTopBarProps) {
  return (
    <View className="app-top-bar">
      <Text className="app-top-bar-side">{leftText}</Text>
      <Text className="app-top-bar-title">{title}</Text>
      <Text className="app-top-bar-side app-top-bar-right">{rightText}</Text>
    </View>
  );
}
