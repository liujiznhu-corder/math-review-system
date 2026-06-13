import { Text, View } from "@tarojs/components";
import { Card } from "../../components/Card";
import "./index.scss";

export default function ReviewPage() {
  return (
    <View className="page-shell placeholder-page">
      <Card className="placeholder-card">
        <Text className="placeholder-title">今日复习</Text>
        <Text className="placeholder-copy">
          第一阶段仅保留 Tab 页面占位，后续接入今日复习静态与业务流程。
        </Text>
      </Card>
    </View>
  );
}
