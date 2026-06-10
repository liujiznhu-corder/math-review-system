"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type ContextBackLinkProps = {
  fallbackHref: string;
  label: string;
  returnUrl?: string | null;
};

export function ContextBackLink({
  fallbackHref,
  label,
  returnUrl
}: ContextBackLinkProps) {
  const safeReturnUrl = normalizeReturnUrl(returnUrl);

  if (safeReturnUrl) {
    return (
      <Link
        href={safeReturnUrl}
        className="inline-flex items-center gap-2 text-sm font-medium text-ink/65 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }

        window.location.href = fallbackHref;
      }}
      className="inline-flex items-center gap-2 text-sm font-medium text-ink/65 hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}

function normalizeReturnUrl(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}
