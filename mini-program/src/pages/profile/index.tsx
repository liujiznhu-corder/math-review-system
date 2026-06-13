import { Text, View } from "@tarojs/components";
import { Card } from "../../components/Card";
import "./index.scss";

export default function ProfilePage() {
  return (
    <View className="page-shell placeholder-page">
      <Card className="placeholder-card">
        <Text className="placeholder-title">我的</Text>
        <Text className="placeholder-copy">
          第一阶段仅保留我的 Tab 占位；微信登录、邀请码绑定和授权状态暂不实现。
        </Text>
      </Card>
    </View>
  );
}
