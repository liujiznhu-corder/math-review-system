import { View } from "@tarojs/components";
import "./index.scss";

type ProgressBarProps = {
  percent: number;
  tone?: "primary" | "warning";
};

export function ProgressBar({ percent, tone = "primary" }: ProgressBarProps) {
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <View className="progress-bar">
      <View
        className={`progress-bar-fill progress-bar-fill-${tone}`}
        style={{ width: `${safePercent}%` }}
      />
    </View>
  );
}
