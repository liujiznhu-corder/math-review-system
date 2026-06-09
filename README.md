# 江苏专转本数学错题复盘系统

Next.js App Router + TypeScript + Tailwind CSS + Supabase 的 Web MVP。

第一版以线上 Supabase 项目为默认运行方式。本地 Supabase CLI/Docker 只作为后续开发选项，不是当前 MVP 的必需条件。

## 本地运行

1. 安装依赖：

```bash
npm install
```

2. 复制环境变量文件：

```bash
cp .env.local.example .env.local
```

3. 在 `.env.local` 中填写线上 Supabase 项目的 URL、anon key 和 service role key：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` 在 Supabase 控制台 `Project Settings` -> `API` 中获取。它没有 `NEXT_PUBLIC_` 前缀，只能用于服务端 Server Action，不会暴露给浏览器。

4. 在 Supabase SQL Editor 执行 [docs/supabase-schema.sql](./docs/supabase-schema.sql)。

5. 启动开发服务：

```bash
npm run dev
```

## 数据库

完整 SQL schema 位于：

- [docs/supabase-schema.sql](./docs/supabase-schema.sql)：线上 Supabase SQL Editor 直接执行。
- [supabase/migrations/202606090001_initial_schema.sql](./supabase/migrations/202606090001_initial_schema.sql)：后续接入 Supabase CLI 时使用。
- 已执行过初始 schema 的线上项目，继续执行 [supabase/migrations/202606090002_add_latex_fields_to_mistakes.sql](./supabase/migrations/202606090002_add_latex_fields_to_mistakes.sql) 增加 LaTeX 输入字段。
- 已执行过前两次迁移的线上项目，继续执行 [supabase/migrations/202606090003_add_roles_and_question_type_permissions.sql](./supabase/migrations/202606090003_add_roles_and_question_type_permissions.sql) 增加角色与题型库写权限。
- 已执行过前三次迁移的线上项目，继续执行 [supabase/migrations/202606090004_add_mistake_review_flow.sql](./supabase/migrations/202606090004_add_mistake_review_flow.sql) 增加错题审核流字段、RLS 和复习任务触发逻辑。
- 如果教师审核错题时报 `new row violates row-level security policy for table "mistakes"`，继续执行 [supabase/migrations/202606090005_fix_teacher_review_rls.sql](./supabase/migrations/202606090005_fix_teacher_review_rls.sql) 修复教师审核更新策略和复习任务插入策略。
- 若仍遇到教师审核 RLS 拦截，执行 [supabase/migrations/202606090006_combine_mistakes_update_policy.sql](./supabase/migrations/202606090006_combine_mistakes_update_policy.sql)。该迁移将 `mistakes` 的学生更新和教师审核更新合并为一条明确的 UPDATE policy，并避免复习任务生成失败回滚教师确认。
- 执行 [supabase/migrations/202606090007_review_tasks_module.sql](./supabase/migrations/202606090007_review_tasks_module.sql) 启用新版今日复习模块字段、RLS 和复习任务生成逻辑。

核心表：

- `profiles`
- `question_types`
- `question_type_examples`
- `mistakes`
- `review_tasks`
- `review_records`

当前权限模型：

- 题型库：所有登录用户可读，只有 `admin` / `teacher` 可新增、编辑、删除。
- 错题、复习任务、复习记录：按 `auth.uid()` 隔离，只能访问自己的数据。

错题最终确认题型后会生成 1、3、7、14、30 天复习任务。`pending` 的待审核错题不会生成复习任务。

错题审核流：

- 学生可在 `/mistakes/new` 自己选择推荐题型或手动选择已有题型，保存后状态为 `student_selected`。
- 学生不确定时可提交教师审核，状态为 `pending`，此时 `question_type_id` 可以为空。
- `teacher` / `admin` 可在 `/teacher/review-mistakes` 查看所有待审核错题，并确认题型，确认后状态为 `teacher_confirmed`。
- 教师审核写入使用服务端 service role client：先用普通登录态确认当前用户是 `teacher` / `admin`，再用 service role 更新原 `mistakes` 记录并创建复习任务。
- 只有当 `question_type_id` 不为空，且状态为 `student_selected` 或 `teacher_confirmed` 时，数据库才会生成 1、3、7、14、30 天复习任务。
- `pending` 错题不会进入今日复习。

今日复习流程：

1. 学生进入 `/reviews` 查看 `review_date <= 今天` 且 `status = pending` 的复习任务。
2. 点击“已掌握”后，当前任务会更新为 `completed`，`result = mastered`。
3. 点击“未掌握”后，当前任务会更新为 `completed`，`result = not_mastered`，并追加 3 天后、7 天后的补复习任务。
4. 错题库 `/mistakes` 会显示每道错题的待复习任务数、已完成复习次数和最近一次复习结果。

测试今日复习：

1. 学生登录，进入 `/mistakes/new` 录入错题并选择题型保存。
2. 在 Supabase `review_tasks` 表检查是否生成 `day1/day3/day7/day14/day30` 五条任务。
3. 如需立即测试，可临时把某条任务的 `review_date` 改成今天或今天以前。
4. 进入 `/reviews`。
5. 点击“已掌握”或“未掌握”。
6. 回到 Supabase 检查任务 `status/result/completed_at` 是否更新；若点击“未掌握”，检查是否新增 `retry_day3/retry_day7`。

## 账号创建

本系统不开放前台自主注册。请在 Supabase 控制台创建或邀请用户。

建议先在 Supabase 控制台关闭公开注册：

1. 打开 `Authentication` -> `Providers` -> `Email`
2. 关闭允许用户自主注册的选项
3. 保留管理员创建用户或邀请用户的能力

创建第一个管理员：

1. 在 `Authentication` -> `Users` 中创建你的邮箱账号
2. 回到 SQL Editor，执行：

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

创建学生账号：

1. 在 `Authentication` -> `Users` 中创建或邀请学生邮箱
2. `profiles.role` 默认是 `student`，通常不需要额外 SQL
3. 如需确认，可执行：

```sql
update public.profiles
set role = 'student'
where email = 'student@example.com';
```

创建教师账号：

```sql
update public.profiles
set role = 'teacher'
where email = 'teacher@example.com';
```

角色权限：

- `student`：录入错题、错题库、今日复习
- `teacher` / `admin`：拥有学生功能，并可管理题型库

## 项目结构

```text
app/                     Next.js App Router 页面
docs/                    可直接使用的 SQL 与项目文档
lib/env.ts               环境变量读取
lib/supabase/            Supabase browser/server/middleware 客户端封装
services/classifier.ts   分类服务，后续 AI 分类替换点
supabase/migrations/     Supabase CLI migration 文件
types/database.ts        Supabase 数据库类型
```

## 常用命令

```bash
npm run lint
npm run build
```

## 原生 LaTeX 题目录入

教师或管理员可进入：

```text
/teacher/problems
/teacher/problems/new
```

`/teacher/problems` 是教师题库列表，支持查看、复制、编辑、删除已录入题目，并可按题目类型、一级分类、二级分类、三级题型、来源和关键词筛选。`/question-types` 只管理题型，不显示具体题目。

支持三类题目：

- `single_choice`：单选题
- `fill_blank`：填空题
- `calculation`：计算题

教师录入的 `raw_latex` 会原样保存，不做格式化和重写。后续导出时通过 `services/latex-exporter.ts` 的 `exportProblemLatex(problem)` 优先直接返回 `raw_latex`。

当前渲染器位于：

```text
components/problems/LatexProblemRenderer.tsx
```

以下页面统一使用该渲染器：

- `/teacher/problems/new`
- `/teacher/problems`
- `/mistakes/new`
- `/mistakes`
- `/reviews`
- `/teacher/review-mistakes`

支持自定义命令：

```latex
\blankbox
\_\_\_
___
\fourchoices{$-4$}{$-1$}{$1$}{$4$}
```

`\blankbox` 渲染为 `（　　　）`。文本模式下的 `\_\_\_` 或 3 个以上连续下划线会渲染为填空横线，不影响数学公式里的下标。`\fourchoices` 支持单行和换行写法，选项内部可以包含 `$\frac{1}{2}$`、`$\lim$`、`cases` 等 KaTeX 支持的标准 LaTeX。普通 `$...$` 和 `$$...$$` 公式由 KaTeX 渲染。

## 角色导航与页面权限

学生导航只显示：

- 仪表盘
- 录入错题
- 错题库
- 今日复习

教师和管理员导航只显示：

- 教师仪表盘
- 题型库
- 错题审核
- 教师题库
- 录入题目

教师或管理员访问学生页面 `/mistakes/new`、`/mistakes`、`/reviews` 时会重定向到 `/teacher/dashboard`。学生访问教师页面 `/question-types`、`/teacher/review-mistakes`、`/teacher/problems`、`/teacher/problems/new`、`/teacher/dashboard` 时会重定向到 `/dashboard`。

## 学生仪表盘

`/dashboard` 对学生实时统计以下内容，数据直接来自 `review_tasks` 和 `question_types`：

- 今日待复习
- 今日已完成
- 完成率
- 连续学习天数
- 你的薄弱题型 TOP5：按三级题型统计 `mastered_count / total_reviews`，掌握度升序
- 知识点掌握度：按一级分类汇总掌握度并显示进度条
- 最近复习记录
- 最近 30 天复习结果时间轴

学生仪表盘不依赖 `knowledge_mastery` 缓存表。

分类用文本由 `services/latex-normalizer.ts` 生成，会去掉 LaTeX 命令、提取选择题选项，并把 `\blankbox` 视为“填空”。

如果线上库已经执行到 `202606090009`，请继续执行：

```text
supabase/migrations/202606090010_fix_problems_table_and_dashboard.sql
```

## 学生登录首页

学生登录成功后默认进入 `/dashboard`。当前 `/dashboard` 会根据 `profiles.role` 展示不同内容：

- `student`：顶部展示江苏专转本数学考试倒计时卡片，下方保留完整学习仪表盘。
- `teacher` / `admin`：展示教师基础统计入口。

学生 Dashboard 顶部倒计时卡片展示考试日期 `2027年3月21日`、动态剩余天数和复盘提醒文案，并提供三个快捷入口：

- 录入错题：`/mistakes/new`
- 错题库：`/mistakes`
- 今日复习：`/reviews`

## 错题答案解析

学生录入错题时只需要填写题目内容和备注，不需要填写答案或解析。

答案解析由教师端“答案解析中心”统一维护：

- `/teacher/solutions`：答案解析列表、筛选、统计和来源追溯。
- `/teacher/solutions/[id]`：编辑某一道题的 `answer` 和 `analysis`，左侧输入、右侧实时预览。
- `/teacher/review-mistakes`：审核学生错题后，系统会把已确认题型的错题沉淀为 `student_submitted` 来源的 problem，进入答案解析中心。
- `/teacher/problems` 和 `/teacher/problems/new` 只负责题目录入与题型归类，不再维护答案解析。

学生错题库 `/mistakes` 默认只展示题目、所属题型、分类状态和录入时间。点击“查看答案”进入 `/mistakes/[id]/answer`：

- 如果老师已补充答案解析，则渲染展示答案和解析。
- 如果老师尚未补充，则显示“答案解析暂未补充，请等待老师更新。”
- 学生答案页优先读取关联 `problems.answer` / `problems.analysis`；没有关联 problem 时兼容读取 `mistakes.answer` / `mistakes.analysis`。

今日复习 `/reviews` 中每道题也提供“查看答案”入口，跳转到同一个答案页。

答案解析中心的来源追溯字段：

- `problems.source_type`：`teacher_created` / `student_submitted`
- `problems.source_mistake_id`：学生错题沉淀为 problem 时记录原错题 ID
- `problems.created_by`：教师录入时为教师用户 ID，学生提交时为学生用户 ID
