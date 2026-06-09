import Link from "next/link";
import { LogIn } from "lucide-react";
import { signIn } from "@/app/(auth)/actions";

type LoginPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <section className="w-full max-w-sm rounded-md border border-ink/10 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">登录</h1>
        <p className="mt-2 text-sm text-ink/65">
          登录后管理题型库和自己的错题复习数据。
        </p>
        {params?.message ? (
          <p className="mt-4 rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">
            {params.message}
          </p>
        ) : null}
        <form action={signIn} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-ink">
            邮箱
            <input
              name="email"
              type="email"
              required
              className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            密码
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
          >
            <LogIn className="h-4 w-4" />
            登录
          </button>
        </form>
        <p className="mt-5 text-sm text-ink/65">
          还没有账号？
          <Link href="/register" className="font-medium text-moss">
            去注册
          </Link>
        </p>
      </section>
    </main>
  );
}
