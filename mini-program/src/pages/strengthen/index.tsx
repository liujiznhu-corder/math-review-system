import { Text, View } from "@tarojs/components";
import { Card } from "../../components/Card";
import "./index.scss";

export default function StrengthenPage() {
  return (
    <View className="page-shell placeholder-page">
      <Card className="placeholder-card">
        <Text className="placeholder-title">巩固</Text>
        <Text className="placeholder-copy">
          第一阶段仅保留巩固 Tab 占位；薄弱巩固与专项训练将在后续阶段实现。
        </Text>
      </Card>
    </View>
  );
}
