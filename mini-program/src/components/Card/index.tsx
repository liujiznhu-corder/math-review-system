import type { ReactNode } from "react";
import { View } from "@tarojs/components";
import "./index.scss";

type CardProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <View className={`app-card ${className}`} onClick={onClick}>
      {children}
    </View>
  );
}
