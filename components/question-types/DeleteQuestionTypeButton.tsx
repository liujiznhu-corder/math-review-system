"use client";

import { Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";

type DeleteQuestionTypeButtonProps = {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
  label?: string;
};

export function DeleteQuestionTypeButton({
  id,
  action,
  label
}: DeleteQuestionTypeButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "确认删除这个题型吗？关联代表例题会一并删除。"
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton
        pendingText="..."
        title="删除题型"
        className={[
          "inline-flex h-9 items-center justify-center rounded-md border border-clay/20 text-sm font-medium text-clay hover:bg-clay/10",
          label ? "gap-2 px-3" : "w-9"
        ].join(" ")}
      >
        <Trash2 className="h-4 w-4" />
        {label ? <span>{label}</span> : null}
      </SubmitButton>
    </form>
  );
}
