import type { ReactNode } from "react";
import { Text } from "@tarojs/components";
import "./index.scss";

type StatusTagProps = {
  children: ReactNode;
  tone?: "primary" | "success" | "warning" | "muted" | "blue";
};

export function StatusTag({ children, tone = "primary" }: StatusTagProps) {
  return <Text className={`status-tag status-tag-${tone}`}>{children}</Text>;
}
