import type { ReactNode } from "react";
import { Text, View } from "@tarojs/components";
import "./index.scss";

type PrimaryButtonProps = {
  children: ReactNode;
  disabled?: boolean;
};

export function PrimaryButton({ children, disabled = false }: PrimaryButtonProps) {
  return (
    <View className={`primary-button ${disabled ? "primary-button-disabled" : ""}`}>
      <Text className="primary-button-text">{children}</Text>
    </View>
  );
}
