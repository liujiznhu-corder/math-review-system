# 小程序 UI 差距分析

本文档对照 `docs/MINI_PROGRAM_FINAL_SPEC.md`，分析当前 Next.js Web、Supabase 表结构、`services/student/*` 与 `/api/student/*` 能否支撑最终 Stitch 小程序 UI。

本次只做差距分析，不修改代码、不新增数据库、不设计新 UI。

---

# 1. 总体结论

## 已具备的基础

当前项目已经具备小程序 V1 的大部分业务底座：

- 学生 Dashboard 数据：`services/student/dashboard.ts`、`GET /api/student/dashboard`
- 今日复习：`review_tasks`、`services/student/reviews.ts`、`GET /api/student/reviews`、`POST /api/student/reviews/[taskId]/complete`
- 薄弱巩固：`weak_practice_tasks`、`services/student/weak-practice.ts`、`GET /api/student/weak-practice`、`POST /api/student/weak-practice/[taskId]/complete`
- 专项训练：`practice_sessions`、`practice_records`、`services/student/practice.ts`、完整 practice API
- 错题库列表：`mistakes`、`services/student/mistakes.ts`、`GET /api/student/mistakes`
- 答案解析：`problems.answer`、`problems.analysis`、`mistakes.answer`、`mistakes.analysis`、`GET /api/student/solutions`
- LaTeX 标准化与渲染规则：`services/latex-normalizer.ts`、`components/problems/LatexProblemRenderer.tsx`

## V1 关键缺口

小程序 V1 最大缺口不是学习业务表，而是“小程序身份体系”和“若干学生端写入 API”：

- 尚未实现 `openid + 教师邀请码绑定`。
- 尚未实现 `POST /api/wechat/login`、`POST /api/wechat/bind-invite-code`、`GET /api/student/me`、`GET /api/student/subscription-status`。
- 当前 `/api/student/*` 依赖 Supabase Auth cookie 与 `profiles.role = student`，不能直接作为微信小程序 openid 登录方案使用。
- 错题录入目前 Web 端通过 Server Action `app/(app)/mistakes/actions.ts` 保存，尚未提供小程序用 `POST /api/student/mistakes`。
- 错题详情页需要单题详情与学习记录 API，当前仅有列表 API 和答案解析 API。

## 特别判断

- **错题录入页必须保留“提交教师审核”隐藏兜底逻辑。** 当前 Web Server Action 已支持 `intent=submit_review`，保存为 `classification_status = pending` 且不生成复习任务；小程序 API 需要复用该逻辑。
- **薄弱巩固独立页面不应放到 V2。** 最新最终规范已明确薄弱巩固纳入 V1；当前 Web 与 API 已有 `/weak-practice`、`weak_practice_tasks` 和完成接口，V1 可以复用数据与服务，只需要按小程序 UI 重做页面交互。
- **UI 装饰不应新增数据库字段。** 如首页品牌栏、图标、水印、状态卡视觉、训练建议文案、AI 工具标签、按钮图标等均可静态实现。

---

# 2. 跨页面基础能力差距

| 能力 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- |
| 小程序 openid 登录 | 不支持，仅文档规划 | `docs/MINI_PROGRAM_DESIGN.md`；无实际 API/表 | 新增微信登录服务与 API，后端通过 `wx.login code` 换取 openid | P0 |
| 教师邀请码绑定 | 不支持，仅文档规划 | 无 `student_invite_codes`、`student_wechat_bindings`、`student_subscriptions` | V1 必须新增绑定数据模型；不要复用邮箱登录作为小程序长期方案 | P0 |
| 学生权限校验 | Web 支持，微信小程序不支持 | `app/api/student/_utils.ts`、`lib/roles.ts`、`profiles` | 现有 `requireStudentApiUser()` 可保留给 Web API；小程序需新增 openid/session token 校验层 | P0 |
| 统一 JSON 返回 | 已支持 | `app/api/student/_utils.ts` | 继续沿用 `{ ok, data }` / `{ ok, error }` 格式 | P0 |
| LaTeX 展示数据 | 基本支持 | `raw_latex`、`latex_content`、`raw_text`、`stem`、`displayLatex` | 小程序端优先用 API 返回的 `displayLatex`；渲染失败降级 stem | P0 |
| 题型基础数据 | 已支持 | `question_types`、`services/student/mistakes.ts`、`services/student/practice.ts` | 复用；小程序不新增题型表 | P0 |
| 答案解析来源 | 已支持 | `problems.answer`、`problems.analysis`、`mistakes.answer`、`mistakes.analysis`、`services/student/solutions.ts` | 复用；注意 practice/weak-practice 的 answer 来源是 problem，mistake 答案页来源是 mistake/problem | P0 |
| UI 装饰配置 | 不需要数据库 | 图标、水印、颜色、标签文案 | 静态写入小程序前端，不新增字段 | P2 |

---

# 3. 首页

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 首页 | 顶部品牌栏：江苏专转本数学错题复盘系统 | 数据不需要，UI 静态支持 | 无 | 静态渲染，不新增数据库 | P0 |
| 首页 | 考试倒计时卡片 | Web 已有类似组件 | `components/dashboard/ExamCountdownCard.tsx`、`app/(app)/dashboard/page.tsx` | 小程序端本地按固定考试日期 `2027-03-21` 动态计算；不需要 API | P0 |
| 首页 | 四个快捷入口：录入错题、今日复习、薄弱巩固、专项训练 | Web 已有对应页面/路由 | `/mistakes/new`、`/reviews`、`/weak-practice`、`/practice` | 小程序静态入口跳转；不新增数据 | P0 |
| 首页 | 今日待复习主卡 | 已支持 | `services/student/dashboard.ts`、`GET /api/student/dashboard`、`review_tasks` | 复用 `pendingTodayCount`；“包含 N 道错题，M 个概念”中的概念数当前没有直接字段，可用题型去重计算或 V1 先隐藏“概念数” | P0 |
| 首页 | 薄弱巩固状态卡 | 已支持 | `weakPracticeTotalCount`、`weakPracticeCompletedCount`、`weak_practice_tasks` | 复用 dashboard 数据；“需关注”是 UI 状态文案，不新增字段 | P0 |
| 首页 | 专项训练状态卡 | 部分支持 | `practice_records`、`practice_sessions`、`services/student/dashboard.ts` 的 7 日专项训练统计 | 当前 dashboard 没有“今日专项训练是否开始”的专用字段；V1 可根据最近 active/completed session 补 API 字段，或先显示静态“未开始” | P1 |
| 首页 | 薄弱考点 Top 5 | 已支持 | `weakQuestionTypes`、`review_tasks`、`question_types`、`services/student/dashboard.ts` | 复用；注意当前算法来自复习记录掌握度，不是完整 knowledge_mastery 缓存 | P0 |
| 首页 | 近 7 日学习数据 | 已支持 | `sevenDaySummary`、`mistakes`、`review_tasks`、`practice_records`、`weak_practice_tasks` | 复用 `GET /api/student/dashboard` | P0 |

---

# 4. 今日复习

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 今日复习 | 顶部导航、进度区、题号导航 | Web 已有交互模式 | `components/reviews/ReviewSessionWorkspace.tsx`、`app/(app)/reviews/page.tsx` | 小程序按最终截图重做 UI；数据复用任务列表长度和完成数 | P0 |
| 今日复习 | 当前题卡片 | 已支持 | `GET /api/student/reviews`、`services/student/reviews.ts`、`review_tasks`、`mistakes` | 复用 `tasks[].mistake.displayLatex`、questionType、reviewRound | P0 |
| 今日复习 | 查看答案与解析 | 已支持但返回上下文需小程序实现 | `GET /api/student/solutions?mistakeId=`、`app/(app)/mistakes/[id]/answer/page.tsx` | 小程序跳转答案解析页时携带 `returnUrl/source`；不新增表 | P0 |
| 今日复习 | 未掌握 / 已掌握 | 已支持 | `POST /api/student/reviews/[taskId]/complete`、`completeTodayReviewTask()`、`review_tasks` | 复用；未掌握会追加 retry_day3/retry_day7 任务 | P0 |
| 今日复习 | 收藏图标 | 不支持，且最终规范未要求业务收藏 | 无 | 作为 UI 装饰或先隐藏；不要新增收藏表 | P2 |

---

# 5. 薄弱巩固

结论：**薄弱巩固独立页面应放入 V1，不放到 V2。**

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 薄弱巩固 | 每日 5 题生成 | 已支持 | `weak_practice_tasks`、`services/weak-practice.ts`、`services/student/weak-practice.ts` | 复用 `generateDailyWeakPractice()`；进入页面时 GET 即创建或读取今日任务 | P0 |
| 薄弱巩固 | 顶部导航、进度区、题号导航 | Web 已支持类似做题模式 | `components/weak-practice/WeakPracticeSessionWorkspace.tsx`、`app/(app)/weak-practice/page.tsx` | 小程序按最终规范实现“一次一题”；不改表 | P0 |
| 薄弱巩固 | 来源标签：薄弱题型/次薄弱题型/随机挑战 | 已支持 | `weak_practice_tasks.source_type`、`sourceLabel` | 复用；注意当前源码中文标签显示在终端可能乱码，实际文件应确认 UTF-8 | P0 |
| 薄弱巩固 | 题目、题型、答案解析 | 已支持 | `problems.raw_latex`、`problems.answer`、`problems.analysis`、`question_types` | 复用 `GET /api/student/weak-practice` | P0 |
| 薄弱巩固 | 仍需巩固 / 已掌握 | 已支持 | `POST /api/student/weak-practice/[taskId]/complete`、`weak_practice_tasks.status/result` | 复用；小程序端仅重做交互 | P0 |
| 薄弱巩固 | 完成提示 | 部分支持 | `completedCount` 可由任务结果计算 | V1 可前端计算全部 completed 后展示完成态；不新增表 | P1 |

---

# 6. 专项训练题型选择

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 专项训练题型选择 | 一级/二级/三级题型结构 | 已支持 | `GET /api/student/practice/options`、`question_types` | 复用；小程序前端按 level1/level2/level3 组装折叠区 | P0 |
| 专项训练题型选择 | 每个三级题型可练题数 | 已支持 | `getPracticeOptions()`、`problems.question_type_id` | 复用 `availableProblemCount` | P0 |
| 专项训练题型选择 | 掌握度百分比 | 部分支持 | dashboard 中有掌握度，practice options 当前不返回 mastery | V1 可先隐藏或用静态占位；若要准确展示，需要扩展 options API 返回该学生题型掌握度 | P1 |
| 专项训练题型选择 | 开始训练按钮 | 已支持 | `POST /api/student/practice/sessions`、`practice_sessions`、`practice_records` | 复用；必须要求选择三级题型 | P0 |
| 专项训练题型选择 | “专升本真题库”标签 | UI 装饰 | 无 | 静态文案，不新增字段 | P2 |

---

# 7. 专项训练题目

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 专项训练题目 | session 详情与 5 题列表 | 已支持 | `GET /api/student/practice/sessions/[sessionId]`、`practice_sessions`、`practice_records` | 复用 | P0 |
| 专项训练题目 | 题号导航与当前题详情 | Web 已支持 | `components/practice/PracticeSessionWorkspace.tsx` | 小程序重做 UI；数据结构可复用 records | P0 |
| 专项训练题目 | 题目类型标签 | 部分支持 | `problems.problem_type` 已存在，但 API `PracticeRecordView.problem` 当前未暴露 `problemType` | V1 若需要显示“单选题”等，扩展 practice session API 返回 `problemType` | P1 |
| 专项训练题目 | 查看答案与解析 | 已支持 | API records 内含 `answer`、`analysis` | 可在本页展开或跳答案页；按最终 UI 可跳答案解析并保留 return source | P0 |
| 专项训练题目 | 未掌握 / 已掌握 | 已支持 | `POST /api/student/practice/records/[recordId]/complete` | 复用 | P0 |

---

# 8. 专项训练完成

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 专项训练完成 | 总题数、已掌握、待复习 | 已支持 | `GET /api/student/practice/sessions/[sessionId]` records.result | 小程序前端计算即可 | P0 |
| 专项训练完成 | 未掌握题目列表 | 已支持 | `practice_records.result = not_mastered`、`problems.raw_latex` | 复用 session records | P0 |
| 专项训练完成 | 全选/取消全选/复选框 | 已支持业务逻辑 | `POST /api/student/practice/sessions/[sessionId]/add-mistakes` 接收 `recordIds` | 复用；前端控制勾选 | P0 |
| 专项训练完成 | 加入选中的错题库 | 已支持 | `addPracticeMistakes()`、`mistakes`、`practice_records.created_mistake_id` | 复用；会创建错题并触发复习任务逻辑 | P0 |
| 专项训练完成 | 训练建议文案 | UI 静态 | 无 | 静态文案，不新增字段 | P2 |
| 专项训练完成 | 再练一次 / 返回首页 | 前端路由能力 | practice API | 再练一次可回到题型选择或用相同 questionTypeId 新建 session | P1 |

---

# 9. AI 录题助手

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| AI 录题助手 | 题型模板：选择题/填空题/计算题/证明题 | Web 有 AI 助手 UI 思路，但无小程序 API需求 | `app/(app)/mistakes/new/mistake-entry-form.tsx` | 小程序前端静态模板即可 | P0 |
| AI 录题助手 | AI识别提示词、LaTeX格式、复制提示词 | 前端静态支持 | 无 | 小程序端本地模板 + 剪贴板复制；不走后端 | P0 |
| AI 录题助手 | 推荐AI工具标签 | UI 静态 | 无 | 静态展示，不跳转、不新增表 | P2 |
| AI 录题助手 | 图片上传/OCR/AI 调用 | 明确不做 | 无 | 保持不实现，不新增 API | P0 |

---

# 10. 错题录入

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 错题录入 | LaTeX 输入、快捷按钮、实时预览 | Web 支持 | `components/problems/LatexProblemRenderer.tsx`、`services/latex-normalizer.ts` | 小程序端实现对应渲染；后端无需新增字段 | P0 |
| 错题录入 | AI 推荐题型 Top 3 | Web Server Action 支持，API 缺失 | `recommendQuestionTypes()`、`services/classifier.ts`、`question_types`、`question_type_examples` | 新增小程序 API，如 `POST /api/student/mistakes/recommend-types` 或合并到提交 API 前置接口 | P0 |
| 错题录入 | 直接加入错题库 | Web Server Action 支持，API 缺失 | `saveMistake()`、`mistakes`、`createReviewTasksForMistake()` | 新增 `POST /api/student/mistakes`；输入 `latexContent/questionTypeId/submitForReview/note` | P0 |
| 错题录入 | 提交教师审核兜底 | Web 已支持，API 缺失 | `saveMistake()` 中 `intent=submit_review`、`classification_status=pending` | 小程序 V1 必须保留；`submitForReview=true` 时 `question_type_id=null` 且不生成复习任务 | P0 |
| 错题录入 | 手动修改题型 | 数据支持 | `question_types`、`getStudentSelectableQuestionTypes()` | 小程序可复用题型列表；需要 API 返回题型树或复用 practice options 的题型数据 | P0 |
| 错题录入 | LaTeX 为空禁用 | 前端逻辑 | 无 | 小程序前端处理 | P0 |
| 错题录入 | 置信度状态 | 分类器返回 score | `services/classifier.ts` | 小程序前端按 score 判断高/低置信度；阈值需产品确定，V1 可先用 80% | P1 |

特别标注：

- **必须保留“提交教师审核”隐藏兜底逻辑。**
- 直接加入错题库：`classification_status = student_selected`，生成复习任务。
- 提交教师审核：`classification_status = pending`，`question_type_id = null`，暂不生成复习任务。
- 教师 Web 审核后：`classification_status = teacher_confirmed`，再生成复习任务。

---

# 11. 错题本

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 错题本 | 列表展示 | 已支持 | `GET /api/student/mistakes`、`services/student/mistakes.ts`、`mistakes` | 当前 API 是旧版简单列表，V1 可先复用；建议升级为分页版结构 | P0 |
| 错题本 | 关键词搜索 | Web 服务支持，API 未暴露新版分页参数 | `getStudentMistakesListPage()` | 小程序 API 应支持 `keyword/page/pageSize/status/level` | P0 |
| 错题本 | 题型筛选胶囊 | 部分支持 | `question_types`、`questionTypeId` query | V1 可先用 `questionTypeId`；最终 UI 的横向胶囊由前端生成 | P0 |
| 错题本 | 状态标签：待复习/复习中/已掌握 | 部分支持 | `mistakes.status`、`classification_status`、`review_tasks` | 当前 list API 未返回 review 状态统计；V1 可根据 `classification_status/status` 简化展示，完整状态需扩展 API | P1 |
| 错题本 | Day 7/Day 21/掌握度 | 部分支持 | `review_tasks.review_round/review_date/result`、`review_records` | 当前 list API 未返回最近/下一次复习信息；V1 可隐藏或补充聚合字段 | P1 |
| 错题本 | 已经到底啦 | 前端 UI | 无 | 静态列表底部状态，不新增表 | P2 |

---

# 12. 错题详情

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 错题详情 | 单题题目内容 | 部分支持 | `mistakes`、当前无 `/api/student/mistakes/[id]` | 新增 `GET /api/student/mistakes/[id]`，返回题目、题型、状态、displayLatex | P0 |
| 错题详情 | 当前掌握状态 | 部分支持 | `mistakes.status`、`review_tasks.result` | V1 可用 `mistakes.status` 或最近一次 completed review result 推导；需 API 聚合 | P1 |
| 错题详情 | 学习记录时间线 | 部分支持 | `review_tasks`、`review_records` | 当前没有小程序详情 API；V1 可从 review_tasks completed 历史生成时间线 | P1 |
| 错题详情 | 查看答案解析按钮 | 已支持答案 API | `GET /api/student/solutions?mistakeId=` | 复用，跳转携带 `mistakeId` 和 return source | P0 |

---

# 13. 答案解析

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 答案解析 | 从错题查看答案 | 已支持 | `GET /api/student/solutions?mistakeId=`、`services/student/solutions.ts` | 复用 | P0 |
| 答案解析 | 从今日复习查看答案 | 已支持 | review task 关联 mistakeId；solutions API | 复用 `mistakeId` | P0 |
| 答案解析 | 从专项训练/薄弱巩固查看答案 | 部分支持 | practice/weak-practice API record 内已有 `problem.answer/analysis`，solutions API 仅支持 mistakeId | 小程序可直接使用当前任务 API 中的 answer/analysis；如要统一答案页，需要新增 `GET /api/student/solutions?problemId=` | P1 |
| 答案解析 | 标准答案、详细解析 | 已支持 | `problems.answer`、`problems.analysis`、`mistakes.answer`、`mistakes.analysis` | 复用 | P0 |
| 答案解析 | 知识点标签 | 部分支持 | `question_types.level1/level2/level3` | 当前无独立 knowledge tags 表；V1 可用题型路径作为标签，不新增表 | P1 |
| 答案解析 | 学习建议 | 不支持结构化数据 | 无 | V1 用静态文案或基于题型的简单模板；不新增数据库 | P2 |
| 答案解析 | returnUrl/source 返回 | Web 已有思路，小程序需实现 | `components/navigation/ContextBackLink.tsx` | 小程序路由参数保存来源 | P0 |

---

# 14. 我的

| 页面 | UI模块 | 当前系统是否支持 | 涉及现有文件/服务/数据表 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| 我的 | 系统授权状态 | 不支持小程序授权体系 | 当前只有 `profiles.role`，无 subscription 表 | 等 openid + 邀请码体系完成；新增 `GET /api/student/subscription-status` | P0 |
| 我的 | 绑定时间、到期时间 | 不支持 | 无 `bound_at/expires_at` 实表 | 需要小程序授权/绑定表；V1 必须实现后再展示真实数据 | P0 |
| 我的 | 错题总数 | 可支持 | `mistakes` count | 可加入 `GET /api/student/me` 或 dashboard 扩展 | P0 |
| 我的 | 已复习 | 可支持 | `review_tasks.status=completed` count | 可加入 `GET /api/student/me` 或 subscription/profile API | P0 |
| 我的 | 专项训练数 | 可支持 | `practice_records.status=completed` 或 `practice_sessions.status=completed` | 可加入 `GET /api/student/me` | P0 |
| 我的 | 关于系统、隐私说明、联系老师 | 静态/配置类 | 无 | V1 可静态页面或弹层；联系老师若需动态配置再设计，不先加表 | P2 |
| 我的 | 退出登录 | Web 支持，微信登录方式未实现 | `app/(app)/actions.ts` 仅 Web Supabase 登出 | 小程序清除本地 session token/openid 绑定态；依赖微信登录方案 | P0 |

---

# 15. API 缺口清单

| API | 当前状态 | 用途 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- |
| `POST /api/wechat/login` | 未实现 | wx.login code 换 openid，签发小程序会话 | 新增；不影响 Web Supabase Auth | P0 |
| `POST /api/wechat/bind-invite-code` | 未实现 | 首次绑定教师邀请码 | 新增；需邀请码/绑定表 | P0 |
| `GET /api/student/me` | 未实现 | 我的页学习摘要、身份状态 | 新增；基于小程序 session | P0 |
| `GET /api/student/subscription-status` | 未实现 | 授权状态、绑定时间、到期时间 | 新增；基于小程序授权表 | P0 |
| `POST /api/student/mistakes` | 未实现 | 小程序错题录入、直接保存/提交审核 | 新增；复用 `saveMistake()` 业务逻辑并返回 JSON | P0 |
| `POST /api/student/mistakes/recommend-types` | 未实现 | 小程序 AI 推荐题型 Top3 | 新增或合并到错题录入流程；复用 `recommendQuestionTypes()` | P0 |
| `GET /api/student/mistakes/[id]` | 未实现 | 错题详情页 | 新增；返回详情、学习记录、displayLatex | P0 |
| `GET /api/student/solutions?problemId=` | 未实现 | 从专项训练/薄弱巩固进入统一答案页 | 可选；V1 也可直接使用任务 API 内嵌 answer/analysis | P1 |
| `GET /api/student/mistakes` 分页/搜索增强 | 部分实现 | 错题本搜索、筛选、分页 | 从 Web service `getStudentMistakesListPage()` 抽 API | P0 |

---

# 16. 数据表缺口清单

| 数据表/字段 | 当前状态 | 需要原因 | V1处理建议 | 优先级 |
| --- | --- | --- | --- | --- |
| `student_invite_codes` | 未实现 | 教师生成邀请码 | openid 绑定体系需要；新增 migration | P0 |
| `student_wechat_bindings` | 未实现 | openid 与学生资格绑定 | 小程序自动登录与解绑需要；新增 migration | P0 |
| `student_subscriptions` | 未实现 | 授权状态、到期时间 | 我的页“系统授权”真实展示需要；新增 migration | P0 |
| 收藏表 | 未实现 | 今日复习截图有收藏图标 | V1 不新增；图标可先隐藏或装饰 | P2 |
| 知识点标签表 | 未实现 | 答案解析页知识点标签 | V1 用题型路径替代；不要为 UI 标签盲目建表 | P2 |
| 学习建议字段 | 未实现 | 答案解析页学习建议 | V1 静态文案或题型模板；不要新增字段 | P2 |
| 图标/水印配置表 | 未实现 | UI 装饰 | 不新增 | P2 |

---

# 17. V1 推荐实施顺序

1. P0：实现小程序 openid 登录、邀请码绑定、授权状态 API。
2. P0：为现有 `/api/student/*` 增加小程序 session 校验适配，或新增小程序专用 auth wrapper。
3. P0：补齐 `POST /api/student/mistakes` 和题型推荐 API，确保保留提交教师审核兜底。
4. P0：补齐 `GET /api/student/mistakes/[id]` 与错题本分页/搜索增强。
5. P0：复用现有 dashboard、reviews、weak-practice、practice、solutions API 实现首页、复习、薄弱巩固、专项训练、答案解析。
6. P1：补充专项训练题目类型、错题本复习周期/掌握度、错题详情学习记录聚合、problemId 答案页。
7. P2：处理收藏图标、学习建议、推荐 AI 工具标签等纯 UI 或弱业务项。

---

# 18. 风险与边界

- 不要为了 Stitch 截图中的小图标、水印、标签背景新增数据库字段。
- 不要把小程序 openid 用户直接混同为 Web 邮箱登录用户，二者需要明确映射或独立绑定模型。
- 不要删除教师审核流程；错题录入必须允许 pending 状态进入教师 Web 审核。
- 薄弱巩固已进入 V1，不能降级到 V2；当前已有表和 API，主要是小程序 UI 与认证适配工作。
- 答案解析优先复用教师维护的 `problems.answer/analysis` 和 `mistakes.answer/analysis`，不要让学生端编辑答案解析。
