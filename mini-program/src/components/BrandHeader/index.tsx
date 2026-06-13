import { Text, View } from "@tarojs/components";
import "./index.scss";

export function BrandHeader() {
  return (
    <View className="brand-header">
      <View className="brand-mark">
        <Text className="brand-mark-text">学</Text>
      </View>
      <Text className="brand-title">江苏专转本数学错题复盘系统</Text>
    </View>
  );
}
