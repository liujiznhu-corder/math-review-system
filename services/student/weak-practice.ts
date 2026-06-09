import {
  generateDailyWeakPractice,
  getWeakPracticeTasks
} from "@/services/weak-practice";

export async function getTodayWeakPracticeData(userId: string) {
  const today = getChinaDateKey(new Date());
  const tasks = await generateDailyWeakPractice(userId, today);

  return {
    date: today,
    tasks,
    totalCount: tasks.length,
    completedCount: tasks.filter((task) => task.status === "completed").length
  };
}

export async function getTodayWeakPracticeSummary(userId: string) {
  const today = getChinaDateKey(new Date());
  const tasks = await getWeakPracticeTasks(userId, today);

  return {
    totalCount: tasks.length,
    completedCount: tasks.filter((task) => task.status === "completed").length
  };
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
