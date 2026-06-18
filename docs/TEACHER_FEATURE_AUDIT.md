# 教师端功能审计报告

审计日期：2026-06-15

本次审计使用教师端测试账号进行认证。测试账号当前在 `profiles.role` 中的角色为 `admin`，属于教师端可管理角色；纯 `teacher` 角色与 `admin` 的差异未完全验证。审计过程中不记录账号邮箱和密码。

本次只做功能审计与文档记录，未修改教师端业务代码、学生端页面、数据库结构、Supabase RLS、Server Actions、保存/审核/删除逻辑和 LaTeX 渲染逻辑。

## 1. 教师端整体定位

教师端当前主要承担以下职责：

- 查看教师端基础统计，包括学生数、启用题型、待审核错题、错题总数、近 7 天复习完成数和平均掌握度。
- 审核学生提交的待分类错题，确认一级 / 二级 / 三级题型，补充教师备注和可选答案解析。
- 维护共享题型库，包括一级分类、二级分类、三级题型、识别特征、代表例题和启用状态。
- 管理教师题库，录入原生 LaTeX 题目，查看、筛选、编辑、删除题目，并跳转维护答案解析。
- 在答案解析中心统一维护教师题库题目和已确认题型的学生错题的答案与解析。
- 将有价值的学生错题加入教师题库，为专项训练、薄弱巩固和后续导出提供题目基础。

当前线上数据观察：

- 学生数：4
- 当前测试账号角色：`admin`
- `teacher` 角色账号数：0
- 启用题型：6
- 待审核错题：39
- 错题总数：67
- 可进入答案解析中心的学生错题：28
- 教师题库题目：26

## 2. 教师端页面清单

| 页面名称 | 路由 | 当前用途 | 是否可正常打开 | 备注 |
| ---- | -- | ---- | ------- | -- |
| 教师仪表盘 | `/teacher/dashboard` | 查看教师端基础统计 | 是 | `/dashboard` 在管理角色下也展示同一教师仪表盘 |
| 题型库管理 | `/question-types` | 查看、筛选、编辑、删除题型 | 是 | 导航入口明显 |
| 新增题型 | `/question-types/new` | 新增一级 / 二级 / 三级题型、识别特征和代表例题 | 是 | 从题型库列表进入 |
| 编辑题型 | `/question-types/[id]/edit` | 编辑题型路径、识别特征、说明、代表例题、启用状态 | 是 | 从题型库卡片编辑按钮进入 |
| 错题审核 | `/teacher/review-mistakes` | 审核学生待分类错题 | 是 | 导航入口明显 |
| 答案解析中心 | `/teacher/solutions` | 维护教师题库和学生提交错题的答案解析 | 是 | 默认展示教师题库来源 |
| 学生提交答案解析列表 | `/teacher/solutions?source=mistakes` | 查看已确认题型的学生错题并维护答案解析 | 是 | 通过答案解析中心 Tab 进入 |
| 答案解析详情 | `/teacher/solutions/[id]` | 编辑某道教师题库题目的答案解析 | 是 | `id` 为教师题库题目 ID |
| 学生错题答案解析详情 | `/teacher/solutions/mistake_[id]` | 编辑某道学生错题的答案解析 | 是 | 可在此加入教师题库 |
| 教师题库 | `/teacher/problems` | 查看、筛选、复制、编辑、删除教师题库题目 | 是 | 导航入口明显 |
| 录入题目 | `/teacher/problems/new` | 新增原生 LaTeX 教师题库题目 | 是 | 导航入口明显 |

未发现独立的“导出页面”或下载按钮；当前导出能力主要体现在 `services/latex-exporter.ts` 的 `exportProblemLatex(problem)` 工具函数，以及页面中的“复制 LaTeX / 复制答案 LaTeX / 复制解析 LaTeX”按钮。

## 3. 教师端功能清单

### 教师审核学生错题

- 页面路由：`/teacher/review-mistakes`
- 当前可见数据：`classification_status = pending` 的学生错题；本次数据中有 39 条。
- 可执行操作：
  - 按提交人、提交时间、关键词筛选。
  - 根据题型库对待审核错题生成系统推荐 top 3。
  - 指定最终题型。
  - 修改题目类型。
  - 可选规范化 `raw_latex`。
  - 补充教师备注。
  - 可选补充答案和解析。
  - 点击“确认题型”完成审核。
- 题型指定能力：可以在审核表单中选择已有一级 / 二级 / 三级题型组合。
- 审核后状态：Server Action 将错题更新为 `classification_status = teacher_confirmed`、`classified_by = teacher`，并写入 `question_type_id`、`teacher_note`、可选 `answer` / `analysis`。
- 复习任务：审核成功后调用 `createReviewTasksForMistake` 创建复习任务。
- 答案解析流程：审核完成后会 `revalidatePath("/teacher/solutions")`，已确认题型的学生错题可进入答案解析中心继续维护。
- loading / 错误提示：提交按钮使用 `SubmitButton`，有 pending 文案；错误通过 URL message 或页面错误块展示。
- 当前体验问题：
  - 题型筛选依赖系统推荐 top 3，并在当前页数据加载后再过滤；分页总数仍来自待审核错题查询，筛选后可能出现页内为空或计数不直观。
  - 审核页字段较多，`raw_latex`、教师备注、答案解析折叠区都在同一卡片中，长题较多时页面偏重。

### 答案与解析中心

- 页面路由：
  - `/teacher/solutions`
  - `/teacher/solutions?source=mistakes`
  - `/teacher/solutions/[id]`
  - `/teacher/solutions/mistake_[id]`
- 当前可见数据：
  - 教师题库 `problems`：26 条。
  - 已确认题型的学生错题 `mistakes`：28 条。
  - 学生自己选择题型保存的错题：包含在 `student_selected` 中，可在学生提交 Tab 中维护。
  - 教师审核后的错题：包含在 `teacher_confirmed` 中，可在学生提交 Tab 中维护。
- 可执行操作：
  - 按来源 Tab 查看教师题库或学生提交。
  - 按题型、答案状态、来源类型、关键词、提交人筛选。
  - 查看题目 LaTeX 渲染。
  - 查看答案 / 解析。
  - 复制题目、答案、解析 LaTeX 源码。
  - 编辑答案和解析。
  - 将学生错题加入教师题库。
- 保存行为：
  - 教师题库题目保存到 `problems.answer` / `problems.analysis`。
  - 学生错题保存到 `mistakes.answer` / `mistakes.analysis`。
  - 如果教师题库题目有关联 `source_mistake_id`，保存答案解析时会同步回对应学生错题。
- LaTeX 预览：
  - 列表和详情题干使用 `LatexProblemRenderer`。
  - 答案和解析使用 `LatexContentRenderer`。
  - 详情编辑页提供答案预览和解析预览。
- 当前体验问题：
  - 默认进入教师题库 Tab，学生提交 Tab 需要再点一次；对于“补学生错题答案解析”的日常流程，入口不够前置。
  - 统计卡片中“本页待补答案 / 本页待补解析”是当前页统计，不是全量待办数，后续可以增加全量待补任务感。
  - 学生错题加入教师题库按钮较靠近编辑和复制操作，需要更明确风险/结果说明。

### 教师题库

- 页面路由：
  - `/teacher/problems`
  - `/teacher/problems/new`
- 题目来源：
  - 教师手动录入：`source_type = teacher_created`。
  - 学生错题沉淀：`source_type = student_submitted`，通过 `source_mistake_id` 关联原错题。
- 可执行操作：
  - 新增题目。
  - 按题型、来源、关键词筛选。
  - 查看题目 LaTeX 渲染。
  - 复制题目 / 答案 / 解析 LaTeX。
  - 跳转答案解析详情。
  - 展开查看 `raw_latex` 和答案解析源码。
  - 展开编辑题目类型、题型、`raw_latex` 和来源。
  - 删除教师题库题目。
- 答案解析：列表提供“答案解析”入口，真正编辑在 `/teacher/solutions/[id]`。
- 导出：未看到独立导出按钮；代码存在 `exportProblemLatex(problem)`，优先导出 `raw_latex`。
- 学生删除错题影响：
  - 学生端删除 action 只删除 `mistakes` 中 `user_id = 当前用户` 的记录。
  - `problems.source_mistake_id` 外键在 schema 文档中为 `on delete set null`，学生删除错题不应删除教师题库题目。
  - 未执行真实删除破坏性测试。
- 当前体验问题：
  - 教师题库删除按钮未看到二次确认逻辑，存在误删风险。
  - 题库列表中的编辑表单是折叠内联表单，修改 `raw_latex` 时没有同步预览。
  - 答案解析编辑不在题库编辑表单内，虽然职责清晰，但教师首次使用时可能不知道要跳转到答案解析中心。

### 题型库

- 页面路由：
  - `/question-types`
  - `/question-types/new`
  - `/question-types/[id]/edit`
- 题型结构：一级 / 二级 / 三级题型均存在，当前 6 个启用题型。
- 筛选能力：支持一级、二级、三级级联筛选，支持启用状态和关键词搜索。
- 新增 / 编辑能力：
  - 新增和编辑使用独立页面。
  - 字段包括一级分类、二级分类、三级题型、题型说明、识别特征、启用状态。
  - 代表例题支持新增、删除、LaTeX 输入和实时预览。
- 删除能力：
  - 题型列表中删除按钮有 `window.confirm` 二次确认。
  - 删除会调用 `deleteQuestionType`，关联代表例题由 action 删除/数据库关系处理。
- 当前体验问题：
  - 题型库列表一次性读取全部题型后前端过滤；当前 6 条问题不大，后续题型多时需要分页或服务端筛选。
  - 题型编辑页功能完整，但输入字段较密集，后续 UI 优化可增强分区和说明。

## 4. 教师端核心业务流程

### 流程 A：学生提交教师审核

```text
学生提交错题 → 教师审核 → 指定题型 → 学生错题状态更新 → 后续补充答案解析 → 学生可查看答案
```

当前状态：

1. 学生提交审核后，错题状态为 `pending`，当前有 39 条待审核。
2. 教师在 `/teacher/review-mistakes` 可以看到待审核错题、学生备注、提交时间和系统推荐 top 3。
3. 教师必须选择题型才能确认审核，可选填教师备注、规范化 `raw_latex`、答案和解析。
4. 确认后状态变为 `teacher_confirmed`，并创建复习任务。
5. 审核后的错题会进入 `/teacher/solutions?source=mistakes`，可继续补充答案解析。
6. 学生答案页会优先读取关联教师题库答案解析，没有关联题库时读取 `mistakes.answer` / `mistakes.analysis`。

结论：链路完整；未执行真实审核提交以避免改动生产/本地数据。

### 流程 B：学生自己选择题型保存错题

```text
学生保存错题 → 进入学生错题库和复习计划 → 教师仍可补充答案解析 → 学生查看答案
```

当前状态：

1. 学生选择题型保存后状态为 `student_selected`，会立即创建复习任务。
2. 答案解析中心学生提交 Tab 查询 `student_selected` 和 `teacher_confirmed` 两类错题。
3. 当前数据中 `student_selected` 有 20 条，说明这类错题存在且可进入答案解析维护范围。
4. 教师可在 `/teacher/solutions?source=mistakes` 为这类错题补充答案和解析。
5. 补充后学生通过错题答案页查看。

结论：链路完整；未执行真实保存/修改提交。

### 流程 C：教师维护题库

```text
教师录入 / 维护题目 → 补充答案解析 → 用于专项训练 / 薄弱巩固 / 导出
```

当前状态：

1. 教师可在 `/teacher/problems/new` 录入原生 LaTeX 题目，保存 `raw_latex`、题型、来源和 `source_type = teacher_created`。
2. 教师可在 `/teacher/problems` 查看、筛选、编辑和删除题目。
3. 答案解析在 `/teacher/solutions/[id]` 维护，不直接在教师题库编辑表单里维护。
4. 专项训练和薄弱巩固服务读取 `problems` 题库。
5. 导出能力目前是代码服务函数和复制源码按钮，未见独立导出页面。

结论：维护题库和答案解析链路可用；导出入口需要后续明确。

## 5. 权限与安全边界

- `admin` 和 `teacher` 都通过 `canManageQuestionTypes(role)` 判定为可管理角色。
- 当前测试账号为 `admin`；纯 `teacher` 账号不存在，admin 与 teacher 的细粒度差异未完全验证。
- teacher/admin 可访问：
  - `/teacher/dashboard`
  - `/question-types`
  - `/question-types/new`
  - `/question-types/[id]/edit`
  - `/teacher/review-mistakes`
  - `/teacher/solutions`
  - `/teacher/solutions/[id]`
  - `/teacher/problems`
  - `/teacher/problems/new`
- 使用测试 student 账号验证：
  - `/teacher/dashboard`
  - `/question-types`
  - `/teacher/problems`
  - `/teacher/solutions`
  均返回 307 并重定向到 `/dashboard`。
- 教师端使用 service role 读取跨学生统计、待审核错题和答案解析数据，但页面/action 会先校验当前登录用户角色。
- 学生删除自己的错题只调用 `deleteMyMistake`，条件包含 `.eq("user_id", user.id)`；不会按 `source_mistake_id` 反向删除教师题库。
- 教师题库中来自学生错题的记录通过 `source_mistake_id` 关联；schema 文档记录该外键为 `on delete set null`。

未完全验证：

- 未用纯 `teacher` 角色账号重复验证。
- 未实际执行学生删除错题并检查关联教师题库是否仍保留，以避免改动数据。
- 未实际执行教师端删除题库题目。

## 6. LaTeX 与数学题展示

- 教师审核页：待审核错题如果是 LaTeX 输入，使用 `LatexProblemRenderer` 渲染；普通文本题则以文本显示。
- 答案解析中心：题干使用 `LatexProblemRenderer`，答案/解析使用 `LatexContentRenderer`。
- 教师题库：题目列表使用 `LatexProblemRenderer`，可展开查看原始 `raw_latex`。
- 题型库：代表例题使用 `LatexProblemRenderer`，新增/编辑时有实时预览。
- 教师录题页：`raw_latex` 输入旁有实时预览。
- 答案解析详情页：答案和解析编辑区有实时预览。
- 长公式处理：`LatexProblemRenderer` 外层有 `max-w-full` 和 `overflow-x-auto`，长公式不应撑破卡片。
- 本次 SSR 页面文本中能看到 KaTeX 渲染后的数学文本和原始 LaTeX 源码共存；未发现把 LaTeX 破坏成不可恢复纯文本的问题。

## 7. 当前发现的问题

| 优先级 | 问题 | 所在页面 | 影响 | 建议 |
| --- | -- | ---- | -- | -- |
| P0 | 未发现阻断教师审核、答案解析保存或题库访问的 P0 问题 | - | - | 继续保留现有核心流程 |
| P1 | 教师测试账号当前是 `admin`，且当前没有纯 `teacher` 账号 | 权限验证 | 无法完整区分 admin 与 teacher 权限差异 | 准备一个纯 `teacher` 测试账号用于后续回归 |
| P1 | 错题审核页题型筛选基于推荐 top 3，并在分页后过滤 | `/teacher/review-mistakes` | 筛选结果和分页总数可能不够直观，可能出现当前页被过滤为空 | 后续改为更明确的“按推荐题型筛选”说明，或在查询前计算候选 |
| P1 | 教师题库删除按钮未见二次确认 | `/teacher/problems` | 存在误删教师题库题目的风险 | 删除题目前增加确认弹窗，并说明不影响学生错题或会产生的影响 |
| P1 | 导出能力没有明显页面入口 | `/teacher/problems`、`/teacher/solutions` | 教师不容易发现如何导出题目 | 增加明确的导出入口，或在题库页提供按筛选结果导出 |
| P1 | 答案解析中心默认进入教师题库 Tab | `/teacher/solutions` | 如果教师主要任务是补学生错题答案解析，需要额外切换 | 教师 dashboard 增加“待补学生错题答案解析”入口，或保留来源偏好 |
| P2 | 教师 dashboard 只有基础统计，没有待办入口 | `/teacher/dashboard` | 可用但任务感弱 | 后续增加待审核、待补答案、题库维护快捷入口 |
| P2 | 教师题库内联编辑 raw_latex 没有同步预览 | `/teacher/problems` | 编辑长题时不易确认渲染结果 | 编辑表单增加预览或改为详情编辑页 |
| P2 | 题型库列表当前为全量读取后前端过滤 | `/question-types` | 当前数据少无明显问题，后续题型增多会影响性能 | 后续改服务端分页/筛选 |

## 8. 后续优化建议

### 第一阶段：教师 dashboard

- 为什么先改：它是教师登录后的第一屏，当前只有统计，没有明确待办入口。
- 需要保留：学生数、启用题型、待审核错题、错题总数、近 7 天复习完成、平均掌握度。
- 可能风险：不要改动跨学生统计查询权限和 service role 使用方式。

### 第二阶段：教师审核学生错题

- 为什么先改：这是学生提交审核后的核心闭环，待审核数量当前较多。
- 需要保留：待审核列表、学生备注、LaTeX 题干、推荐 top 3、选择题型、教师备注、可选答案解析、确认后创建复习任务。
- 可能风险：不能破坏 `pending → teacher_confirmed` 状态流和复习任务生成。

### 第三阶段：答案与解析中心

- 为什么先改：它连接学生错题答案查看、教师题库沉淀和后续训练题质量。
- 需要保留：教师题库/学生提交来源 Tab、答案/解析编辑、LaTeX 预览、加入教师题库、复制源码、同步关联学生错题答案解析。
- 可能风险：不能把学生错题答案解析和教师题库答案解析同步关系改乱。

### 第四阶段：教师题库

- 为什么先改：专项训练和薄弱巩固依赖教师题库质量。
- 需要保留：新增题目、筛选、题目 LaTeX 渲染、复制源码、编辑题目、答案解析入口、删除题目。
- 可能风险：删除和编辑会影响训练题来源，必须增加确认和更清楚的影响说明。

### 第五阶段：题型库

- 为什么后改：当前题型数量少，功能基本完整。
- 需要保留：一级/二级/三级结构、识别特征、说明、代表例题、LaTeX 预览、启用状态、删除确认。
- 可能风险：题型被错题、教师题库和训练模块引用，删除/停用要提示影响范围。

### 第六阶段：导出功能

- 为什么后改：当前核心教学闭环优先级更高，但导出是教师沉淀题库后的自然需求。
- 需要保留：`raw_latex` 原样保存和 `exportProblemLatex(problem)` 优先导出原文的原则。
- 可能风险：导出不应把答案解析或学生数据泄露给无权限用户；导出格式要保留 `$`、`\frac`、`\lim`、`\fourchoices` 等源码。
