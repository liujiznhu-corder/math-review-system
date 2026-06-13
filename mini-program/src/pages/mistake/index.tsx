import { Text, View } from "@tarojs/components";
import { Card } from "../../components/Card";
import "./index.scss";

export default function MistakePage() {
  return (
    <View className="page-shell placeholder-page">
      <Card className="placeholder-card">
        <Text className="placeholder-title">错题</Text>
        <Text className="placeholder-copy">
          第一阶段仅保留错题 Tab 占位；错题本、详情和录入流程后续实现。
        </Text>
      </Card>
    </View>
  );
}
