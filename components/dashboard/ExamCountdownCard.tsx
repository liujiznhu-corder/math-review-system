import { CalendarDays } from "lucide-react";

const examDateLabel = "2027年3月21日";
const examDateKey = "2027-03-21";
const dayMilliseconds = 24 * 60 * 60 * 1000;

export function ExamCountdownCard() {
  const remainingDays = getRemainingDays();

  return (
    <section className="rounded-2xl border border-emerald-100 bg-[#F3F8F4] p-4 text-[#1A362D] shadow-sm">
      <div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
          <CalendarDays className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-medium text-emerald-800/70">
          考试日期：{examDateLabel}
        </p>
        <h2 className="mt-1.5 text-base font-semibold leading-6 text-[#1A362D]">
          江苏专转本数学考试倒计时
        </h2>
      </div>
      <div className="mt-5">
        <div className="flex items-end gap-3">
          <span className="text-6xl font-semibold leading-none text-[#166534] min-[1200px]:text-7xl">
            {remainingDays}
          </span>
          <span className="pb-2 text-xl font-medium text-[#1A362D]/65">天</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#1A362D]/70">
          今天多复盘一道错题，考场上就少一个失分点。
        </p>
      </div>
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
