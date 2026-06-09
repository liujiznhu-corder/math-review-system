import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FilePlus2,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  BookOpenCheck,
  ClipboardList,
  PenLine,
  ShieldCheck
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(app)/actions";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

const studentNavigationItems = [
  {
    href: "/dashboard",
    label: "仪表盘",
    icon: LayoutDashboard
  },
  {
    href: "/mistakes/new",
    label: "录入错题",
    icon: PenLine
  },
  {
    href: "/mistakes",
    label: "错题库",
    icon: ClipboardList
  },
  {
    href: "/reviews",
    label: "今日复习",
    icon: BookOpenCheck
  }
];

const teacherNavigationItems = [
  {
    href: "/teacher/dashboard",
    label: "教师仪表盘",
    icon: LayoutDashboard
  },
  {
    href: "/question-types",
    label: "题型库",
    icon: LibraryBig
  },
  {
    href: "/teacher/review-mistakes",
    label: "错题审核",
    icon: ShieldCheck
  },
  {
    href: "/teacher/problems",
    label: "教师题库",
    icon: LibraryBig
  },
  {
    href: "/teacher/problems/new",
    label: "录入题目",
    icon: FilePlus2
  }
];

export default async function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getCurrentUserRole();
  const navigationItems = canManageQuestionTypes(role)
    ? teacherNavigationItems
    : studentNavigationItems;
  const homeHref = canManageQuestionTypes(role)
    ? "/teacher/dashboard"
    : "/dashboard";

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href={homeHref} className="text-base font-semibold text-ink">
            数学错题复盘
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink/70 hover:bg-paper hover:text-ink"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <form action={signOut}>
            <button
              type="submit"
              title="退出登录"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink/10 text-ink/70 hover:bg-paper hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
