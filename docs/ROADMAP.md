# 路线图

本文档记录当前 MVP 之后的演进方向。优先原则：先保证错题录入、审核、复习闭环稳定，再逐步增强智能化和教学管理能力。

## 当前已完成

### 基础工程

- Next.js App Router 项目结构。
- TypeScript。
- Tailwind CSS。
- Supabase Auth、Postgres、RLS。
- Vercel 部署友好的环境变量结构。
- `.env.local.example`。
- Supabase migrations。
- 完整 schema 文档。

### 账号与权限

- 前台不开放注册。
- 登录页。
- 注册页改为提示管理员创建账号。
- `profiles.role` 支持 `admin` / `teacher` / `student`。
- 学生、教师、管理员导航区分。
- 题型库写权限限制为 `teacher` / `admin`。
- 学生数据通过 RLS 隔离。

### 题型库

- 题型从数据库读取。
- 支持新增、编辑、删除题型。
- 支持关键词。
- 支持例题。
- 分类服务使用题型库和例题。

### 错题录入与分类

- `/mistakes/new`。
- 普通文本输入。
- LaTeX 输入。
- LaTeX 实时预览。
- 关键词和例题相似度 top 3 推荐。
- 学生可选择推荐题型。
- 学生可手动选择已有题型。
- 学生可提交教师审核。

### 教师审核流

- `/teacher/review-mistakes`。
- 教师查看 pending 错题。
- 页面展示系统推荐 top 3。
- 教师选择已有题型并确认。
- 教师备注。
- 教师审核写入走 service role client。
- 教师确认后自动生成复习任务。

### 错题库

- `/mistakes`。
- 按题型筛选。
- 展示普通文本或 LaTeX 错题。
- 展示分类状态。
- 展示教师备注。
- 展示复习状态摘要。

### 今日复习

- `/reviews`。
- 展示到期且未完成任务。
- 已掌握。
- 未掌握。
- 未掌握后追加补复习任务。
- `/reviews/today` 兼容重定向。

## 近期优先级

### P0：稳定当前闭环

目标：让真实学生和教师可小范围试用。

建议任务：

- 用真实 Supabase 项目完整跑通：
  - 创建 admin。
  - 创建 teacher。
  - 创建 student。
  - teacher 维护题型库。
  - student 录入错题并选择题型。
  - student 提交教师审核。
  - teacher 审核。
  - student 完成今日复习。
- 检查线上 RLS 是否和 migration 一致。
- 检查 `SUPABASE_SERVICE_ROLE_KEY` 是否只配置在服务端环境。
- 修复任何真实数据下的表单错误提示。
- 确认 UI 中文在浏览器中显示正常。

验收：

- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。
- 线上 Supabase 真实账号流程可跑通。

### P1：补齐基础体验

目标：让学生和教师使用更顺手。

建议任务：

- 错题详情页：
  - 展示完整题目。
  - 展示分类、备注、复习历史。
  - 后续可补充订正过程。
- 错题编辑：
  - 学生编辑题干和备注。
  - 对已确认题型的错题，是否允许重新提交教师审核需单独设计。
- 复习历史页：
  - 当前 `review_records` 表已存在，但今日复习主要更新 `review_tasks`。
  - 可决定是否继续使用 `review_records` 作为事件日志。
- 题型库导入：
  - CSV 或表格粘贴批量导入。
  - 批量维护关键词和例题。
- 更清晰的空状态和错误状态。
- 更友好的移动端布局。

### P2：教师端能力增强

目标：让教师能管理学生学习过程，而不仅是审核分类。

建议任务：

- 学生列表。
- 按学生查看错题。
- 按题型查看学生错题分布。
- 待审核错题筛选：
  - 按提交时间。
  - 按学生。
  - 按推荐题型。
- 教师批量确认相同题型。
- 教师给错题添加复习建议模板。

### P3：分类质量提升

目标：让推荐更接近真实题型。

建议任务：

- 改进 `services/classifier.ts`：
  - 给关键词配置权重。
  - 对一级/二级/三级题型名称也参与匹配。
  - 增加数学符号归一化。
  - 增加同义词词表。
- 增加分类调试输出：
  - 命中关键词。
  - 命中例题。
  - 各项得分。
- 收集教师最终确认结果，用于评估推荐准确率。
- 记录推荐结果快照，便于后续分析。

### P4：AI 和 OCR 接入

目标：减少手工录入成本，提高分类准确性。

建议任务：

- OCR 接入：
  - 支持图片上传。
  - OCR 结果进入文本编辑框，学生可修改后保存。
  - 图片存储可使用 Supabase Storage。
- AI 分类：
  - 保留题型库作为候选集合。
  - AI 只在候选题型内排序和解释，不自由创造题型。
  - 替换或扩展 `services/classifier.ts`。
- AI 订正建议：
  - 根据题目、题型、学生备注生成复习提示。
  - 注意成本、隐私和可控性。

### P5：数据分析和学习报告

目标：让复盘结果变成教学决策依据。

建议任务：

- 学生个人统计：
  - 错题数。
  - 各题型错题分布。
  - 复习完成率。
  - 未掌握题型排行。
- 教师统计：
  - 全部学生薄弱题型。
  - 待审核数量。
  - 复习完成情况。
- 周报/月报：
  - 学生薄弱点。
  - 推荐复习顺序。
  - 高频错因。

## 技术债与风险

### RLS 与 service role

教师审核跨用户写入已改为 service role client。后续继续新增教师端跨学生写入时，应复用相同原则：

1. 先用普通 server client 获取当前登录用户。
2. 查询 `profiles.role`。
3. 确认是 `teacher` / `admin`。
4. 再用 service role client 执行跨用户写入。
5. service role client 不得进入客户端组件。

### 复习任务重复生成

当前 `createReviewTasksForMistake()` 会先检查同一个 `mistake_id` 是否已有任务，避免重复生成。后续如果允许重新分类，需要明确：

- 是否删除旧复习任务。
- 是否保留旧任务但更新 `question_type_id`。
- 是否重新生成周期。

### `review_records` 使用边界

当前今日复习直接更新 `review_tasks`。`review_records` 仍在 schema 中，但不是主路径。后续需要决定：

- 保留为复习事件日志。
- 或简化移除不用的记录逻辑。

### 分类服务边界

`services/classifier.ts` 是后续 AI 分类的替换点。新增 AI 前不要把 AI 调用散落到页面或 Server Actions 中。

建议未来接口保持：

```ts
classifyQuestion({
  stem,
  questionTypes,
  limit
})
```

返回：

```ts
{
  questionTypeId,
  score,
  reasons
}
```

### 数据迁移

已有线上库时，不要重跑完整 `docs/supabase-schema.sql`。应按 `supabase/migrations/` 顺序补执行最新 migration。

全新空库可执行完整 schema 或按 migration 顺序执行。

## 建议开发顺序

1. 先稳定线上数据库和账号流程。
2. 补错题详情页和复习历史页。
3. 补教师端学生视图。
4. 优化 classifier。
5. 再接 OCR。
6. 最后接 AI 分类和学习报告。

## 每次开发完成后的检查

```bash
npm.cmd run lint
npm.cmd run build
```

涉及数据库时额外检查：

- 是否新增 migration。
- 是否同步 `docs/supabase-schema.sql`。
- 是否更新 README 或相关 docs。
- RLS 是否符合学生隔离和教师审核需求。
