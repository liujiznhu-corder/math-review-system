"use client";

import { Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";

type DeleteQuestionTypeButtonProps = {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function DeleteQuestionTypeButton({
  id,
  action
}: DeleteQuestionTypeButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("确认删除这个题型吗？关联代表例题会一并删除。")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton
        pendingText="..."
        title="删除题型"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-clay/20 text-clay hover:bg-clay/10"
      >
        <Trash2 className="h-4 w-4" />
      </SubmitButton>
    </form>
  );
}
