import { CalendarDays } from "lucide-react";

const examDateLabel = "2027年3月21日";
const examDateKey = "2027-03-21";
const dayMilliseconds = 24 * 60 * 60 * 1000;

export function ExamCountdownCard() {
  const remainingDays = getRemainingDays();

  return (
    <section className="rounded-md border border-ink/10 bg-white p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-moss/10 text-moss">
        <CalendarDays className="h-6 w-6" />
      </div>
      <p className="mt-6 text-sm font-medium text-clay">
        考试日期：{examDateLabel}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
        江苏专转本数学考试倒计时
      </h1>
      <div className="mt-8 flex items-end justify-center gap-3">
        <span className="text-7xl font-semibold leading-none text-ink sm:text-8xl">
          {remainingDays}
        </span>
        <span className="pb-2 text-xl font-medium text-ink/60">天</span>
      </div>
      <p className="mx-auto mt-8 max-w-xl text-base leading-7 text-ink/70">
        今天多复盘一道错题，考场上就少一个失分点。
      </p>
    </section>
  );
}

function getRemainingDays() {
  const todayKey = getChinaDateKey(new Date());
  const todayTime = dateKeyToUtc(todayKey).getTime();
  const examTime = dateKeyToUtc(examDateKey).getTime();

  return Math.max(0, Math.ceil((examTime - todayTime) / dayMilliseconds));
}

function getChinaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function dateKeyToUtc(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}
