import type { ReactNode } from "react";
import { Text, View } from "@tarojs/components";
import "./index.scss";

type PrimaryButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

export function PrimaryButton({
  children,
  disabled = false,
  onClick
}: PrimaryButtonProps) {
  return (
    <View
      className={`primary-button ${disabled ? "primary-button-disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
    >
      <Text className="primary-button-text">{children}</Text>
    </View>
  );
}
