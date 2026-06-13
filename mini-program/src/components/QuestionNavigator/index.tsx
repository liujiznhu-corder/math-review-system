import { Text, View } from "@tarojs/components";
import "./index.scss";

export type QuestionNavStatus = "pending" | "mastered" | "not_mastered";

type QuestionNavigatorProps = {
  statuses: QuestionNavStatus[];
  currentIndex: number;
  notMasteredLabel?: string;
  onSelect: (index: number) => void;
};

export function QuestionNavigator({
  statuses,
  currentIndex,
  notMasteredLabel = "未掌握",
  onSelect
}: QuestionNavigatorProps) {
  return (
    <View className="question-nav">
      {statuses.map((status, index) => {
        const isCurrent = index === currentIndex;
        const label = getStatusLabel(status, isCurrent, notMasteredLabel);

        return (
          <View
            key={`${index}-${status}`}
            className="question-nav-item"
            onClick={() => onSelect(index)}
          >
            <View
              className={`question-nav-dot question-nav-dot-${status} ${
                isCurrent ? "question-nav-dot-current" : ""
              }`}
            >
              <Text className="question-nav-number">
                {status === "mastered" ? "✓" : index + 1}
              </Text>
            </View>
            <Text className="question-nav-label">{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function getStatusLabel(
  status: QuestionNavStatus,
  isCurrent: boolean,
  notMasteredLabel: string
) {
  if (status === "mastered") {
    return "已掌握";
  }
  if (status === "not_mastered") {
    return notMasteredLabel;
  }
  return isCurrent ? "复习中" : "待做";
}
