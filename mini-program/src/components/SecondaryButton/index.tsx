import type { ReactNode } from "react";
import { Text, View } from "@tarojs/components";
import "./index.scss";

type SecondaryButtonProps = {
  children: ReactNode;
  tone?: "default" | "warning";
  onClick?: () => void;
};

export function SecondaryButton({
  children,
  tone = "default",
  onClick
}: SecondaryButtonProps) {
  return (
    <View className={`secondary-button secondary-button-${tone}`} onClick={onClick}>
      <Text className="secondary-button-text">{children}</Text>
    </View>
  );
}
