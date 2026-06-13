import { Text, View } from "@tarojs/components";
import "./index.scss";

type MetricCardProps = {
  label: string;
  value: string | number;
  tone?: "default" | "primary" | "warning";
};

export function MetricCard({ label, value, tone = "default" }: MetricCardProps) {
  return (
    <View className={`metric-card metric-card-${tone}`}>
      <Text className="metric-card-value">{value}</Text>
      <Text className="metric-card-label">{label}</Text>
    </View>
  );
}
