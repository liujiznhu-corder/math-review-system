"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingText?: string;
  children: ReactNode;
};

export function SubmitButton({
  pendingText = "处理中...",
  children,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      aria-busy={pending}
      disabled={pending || disabled}
    >
      {pending ? pendingText : children}
    </button>
  );
}
