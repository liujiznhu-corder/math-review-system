# 项目上下文

本文档用于让新的 GPT 对话快速接手当前项目。请以当前代码为准，增量开发，不要重建项目或推翻已有目录结构。

## 项目定位

这是一个面向江苏专转本数学学生的错题复盘 Web MVP。系统只对老师自己的学生开放，不提供公开注册。学生录入错题后，系统根据数据库中的题型库、关键词和例题推荐题型；学生可自行确认，也可提交教师审核。错题最终确定题型后，系统生成 1、3、7、14、30 天复习任务。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase：Auth、Postgres、RLS
- Vercel 部署目标
- KaTeX：LaTeX 题目预览

## 当前运行方式

项目默认连接线上 Supabase。克隆后配置 `.env.local` 即可运行：

```bash
npm install
npm.cmd run dev
```

必要环境变量：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` 只允许服务端使用，当前用于教师审核后更新学生错题和创建复习任务。

## 关键目录

```text
app/                     Next.js App Router 页面与 Server Actions
app/(auth)/              登录与注册重定向
app/(app)/               登录后应用页面
components/              共享组件
lib/                     环境变量、角色、Supabase client
services/                可替换业务服务层
supabase/migrations/     SQL migration
docs/                    项目文档与完整 Supabase schema
types/database.ts        Supabase 类型定义
```

## 关键页面

- `/`：首页，只保留登录入口。
- `/login`：登录页。
- `/register`：不开放注册，会提示由管理员创建账号或邀请。
- `/dashboard`：登录后入口。
- `/question-types`：题型库管理，只有 `admin` / `teacher` 可写。
- `/mistakes/new`：错题录入，支持普通文本和 LaTeX。
- `/mistakes`：错题库，支持按题型筛选，并展示复习状态摘要。
- `/teacher/review-mistakes`：教师审核待分类错题。
- `/reviews`：今日复习页。
- `/reviews/today`：兼容旧路径，重定向到 `/reviews`。

## 关键业务文件

- `services/classifier.ts`
  - 当前分类服务。
  - 不接 AI API。
  - 使用关键词命中和例题文本相似度打分。
  - 后续接 AI 分类时优先替换或扩展此 service。

- `services/latex.ts`
  - 将 LaTeX 输入转为用于分类的纯文本。
  - `getClassificationText()` 是错题推荐和教师审核推荐的统一入口。

- `app/(app)/mistakes/actions.ts`
  - `recommendQuestionTypes()`：读取 Supabase 题型库并调用 classifier 返回 top 3。
  - `saveMistake()`：保存错题；学生选择题型则生成复习任务，提交教师审核则保持 `pending`。

- `app/(app)/reviews/actions.ts`
  - `createReviewTasksForMistake(mistakeId)`：使用 service role client 创建初始复习任务。
  - `getTodayReviewTasks()`：读取当前用户今日及逾期 pending 复习任务。
  - `completeReviewTask()`：完成任务；未掌握时追加 3 天和 7 天补复习任务。

- `app/(app)/teacher/review-mistakes/actions.ts`
  - 教师审核 Server Action。
  - 先用普通 server client 确认当前登录用户身份。
  - role 是 `teacher` 或 `admin` 后，再用 service role client 更新原 mistakes 记录并创建 review_tasks。

- `lib/supabase/admin.ts`
  - 服务端 service role client。
  - 不允许在客户端组件引用。

- `lib/roles.ts`
  - 角色判断。
  - `admin` / `teacher` 可管理题型库和审核错题。

## 数据库核心表

- `profiles`
  - Supabase Auth 用户的业务资料。
  - `role`: `admin` / `teacher` / `student`。

- `question_types`
  - 题型库主表。
  - 字段包括一级分类、二级分类、三级题型、关键词、说明。
  - 题型不能写死在代码里，必须从数据库读取。

- `question_type_examples`
  - 每个题型的例题。
  - classifier 会用例题做相似度匹配。

- `mistakes`
  - 学生错题。
  - 支持普通文本和 LaTeX。
  - 分类状态：`pending` / `student_selected` / `teacher_confirmed`。
  - 分类来源：`student` / `teacher` / `system`。

- `review_tasks`
  - 复习任务。
  - `status`: `pending` / `completed` / `skipped`。
  - `result`: `mastered` / `not_mastered` / `null`。
  - `review_round`: `day1` / `day3` / `day7` / `day14` / `day30` / `retry_day3` / `retry_day7`。

- `review_records`
  - 早期预留复习记录表，目前今日复习主要直接更新 `review_tasks`。

完整 schema 在 `docs/supabase-schema.sql`。迁移文件在 `supabase/migrations/`。

## 权限模型

- 不开放前台自由注册。
- 用户由 Supabase 控制台创建或邀请。
- `profiles.role` 默认为 `student`。
- 学生只能查看和管理自己的 `mistakes`、`review_tasks`、`review_records`。
- 所有登录用户可读题型库。
- 只有 `admin` / `teacher` 可新增、编辑、删除题型。
- `teacher` / `admin` 可查看待审核 `pending` 错题。
- 教师审核写入使用 service role client，避免 RLS 对跨用户更新和任务创建造成阻塞。

## 已实现业务流

### 学生自行确认题型

1. 学生进入 `/mistakes/new`。
2. 选择普通文本或 LaTeX，输入题干。
3. 点击“智能推荐题型”。
4. 系统读取 `question_types` 和 `question_type_examples`，调用 `services/classifier.ts` 返回 top 3。
5. 学生选择推荐题型或手动选择已有题型。
6. 保存错题：
   - `classification_status = student_selected`
   - `classified_by = student`
   - `question_type_id` 不为空
7. 自动生成 1、3、7、14、30 天复习任务。

### 学生提交教师审核

1. 学生在 `/mistakes/new` 输入错题。
2. 点击“提交教师审核”。
3. 保存错题：
   - `classification_status = pending`
   - `question_type_id = null`
4. 不生成复习任务。

### 教师确认题型

1. `teacher` / `admin` 进入 `/teacher/review-mistakes`。
2. 页面显示所有 `classification_status = pending` 的错题。
3. 页面展示系统推荐 top 3 和学生备注。
4. 教师从已有题型中选择最终题型，可填写教师备注。
5. Server Action 用 service role 更新原 mistakes 记录：
   - `classification_status = teacher_confirmed`
   - `classified_by = teacher`
   - `question_type_id` 不为空
   - `teacher_note` 可选
6. 自动为该学生生成复习任务。

### 今日复习

1. 学生进入 `/reviews`。
2. 页面显示 `review_date <= today` 且 `status = pending` 的任务。
3. 点击“已掌握”：
   - 当前任务更新为 `completed`
   - `result = mastered`
   - 写入 `completed_at`
4. 点击“未掌握”：
   - 当前任务更新为 `completed`
   - `result = not_mastered`
   - 追加 `retry_day3` 和 `retry_day7` 两条 pending 任务。

## 当前注意事项

- 题型库必须先有数据，否则推荐结果为空。
- 当前 classifier 是启发式算法，不保证数学语义准确。
- OCR 和 AI 分类尚未接入，但 service 层已经预留替换点。
- 教师审核动作依赖 `SUPABASE_SERVICE_ROLE_KEY`。
- 如果线上库已经执行过旧 migration，新增 migration 应按顺序继续执行，不要在已有数据的库上重跑完整 schema。
- 每次改动后运行：

```bash
npm.cmd run lint
npm.cmd run build
```
