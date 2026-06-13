import type { ReactNode } from "react";
import { View } from "@tarojs/components";
import "./index.scss";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return <View className={`app-card ${className}`}>{children}</View>;
}
