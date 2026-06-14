import { CalendarDays } from "lucide-react";

const examDateLabel = "2027年3月21日";
const examDateKey = "2027-03-21";
const dayMilliseconds = 24 * 60 * 60 * 1000;

export function ExamCountdownCard() {
  const remainingDays = getRemainingDays();

  return (
    <section className="flex min-h-full flex-col justify-between rounded-2xl border border-emerald-100 bg-[#F3F8F4] p-5 text-[#1A362D] shadow-sm sm:p-6">
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
          <CalendarDays className="h-6 w-6" />
        </div>
        <p className="mt-6 text-sm font-medium text-emerald-800/70">
          考试日期：{examDateLabel}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[#1A362D]">
          江苏专转本数学考试倒计时
        </h2>
      </div>
      <div className="mt-10">
        <div className="flex items-end gap-3">
          <span className="text-7xl font-semibold leading-none text-[#166534]">
            {remainingDays}
          </span>
          <span className="pb-2 text-xl font-medium text-[#1A362D]/65">天</span>
        </div>
        <p className="mt-6 text-sm leading-6 text-[#1A362D]/70">
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
