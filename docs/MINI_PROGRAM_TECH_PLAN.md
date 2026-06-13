# 微信小程序技术计划

本文档用于规划“江苏专转本数学错题复盘系统”微信小程序学生端 V1 的技术实现。

规划依据仅包括：

- `docs/PROJECT_CONTEXT.md`
- `docs/MINI_PROGRAM_FINAL_SPEC.md`
- `docs/MINI_PROGRAM_UI_GAP_ANALYSIS.md`
- 当前项目代码

本文档不依据历史聊天记录，不修改现有应用代码。

---

# 1. 目标与边界

## 1.1 V1 目标

小程序 V1 需要完成学生端学习闭环：

1. 微信小程序登录。
2. 通过教师邀请码完成学生资格绑定和授权状态识别。
3. 首页展示今日学习入口、待复习、薄弱巩固、专项训练和近 7 日数据。
4. 今日复习：逐题查看、查看答案解析、标记已掌握/未掌握。
5. 薄弱巩固：每日 5 题、逐题反馈、查看答案解析。
6. 专项训练：选择三级题型、创建 5 题训练、逐题反馈、总结页把未掌握题加入错题库。
7. AI 录题助手：只提供外部 AI 转 LaTeX 的提示词模板和复制能力。
8. 错题录入：LaTeX 录入、题型推荐、直接加入错题库、提交教师审核兜底。
9. 错题本：列表、搜索、筛选、详情、学习记录、答案解析。
10. 我的：授权状态、绑定时间、到期时间、学习统计、退出登录。

## 1.2 非目标

V1 不做：

- 教师端小程序。
- OCR、内置 AI、图片上传识别。
- 支付。
- 班级管理。
- 学生端编辑答案和解析。
- 为图标、水印、标签、训练建议等纯 UI 装饰新增数据库字段。
- 用小程序 `openid` 直接替代 Web Supabase Auth cookie。

---

# 2. 当前工程判断

## 2.1 已有后端底座

当前 Next.js 项目已经有较完整的学生业务服务层：

- `services/student/dashboard.ts`：首页统计、薄弱考点、近 7 日学习数据。
- `services/student/reviews.ts`：今日复习任务读取与完成。
- `services/student/weak-practice.ts`、`services/weak-practice.ts`：每日薄弱巩固任务生成、读取、完成。
- `services/student/practice.ts`：专项训练题型、训练 session、训练记录完成、未掌握题加入错题库。
- `services/student/mistakes.ts`：错题列表、分页筛选能力、学生可选题型、分类器题型数据。
- `services/student/solutions.ts`：错题答案解析。
- `services/classifier.ts`：启发式题型推荐。
- `services/latex-normalizer.ts`、`services/latex.ts`：LaTeX 标准化与分类文本提取。

这些服务大多以 `userId` 为入口，适合被小程序 API 复用。

## 2.2 已有 API 底座

已有 `/api/student/*` 接口覆盖：

- `GET /api/student/dashboard`
- `GET /api/student/reviews`
- `POST /api/student/reviews/[taskId]/complete`
- `GET /api/student/weak-practice`
- `POST /api/student/weak-practice/[taskId]/complete`
- `GET /api/student/practice/options`
- `POST /api/student/practice/sessions`
- `GET /api/student/practice/sessions/[sessionId]`
- `POST /api/student/practice/records/[recordId]/complete`
- `POST /api/student/practice/sessions/[sessionId]/add-mistakes`
- `GET /api/student/mistakes`
- `GET /api/student/solutions?mistakeId=...`

但这些 API 当前都通过 `app/api/student/_utils.ts` 的 `requireStudentApiUser()` 校验 Supabase Auth cookie 和角色。这个方案不能直接满足小程序 `wx.login -> openid -> 小程序 session` 的身份链路。

## 2.3 最大技术缺口

小程序 V1 最大缺口不是复习、练习、题库这些业务表，而是：

1. 小程序身份体系。
2. 教师邀请码绑定与授权状态。
3. 小程序 session 到现有 `userId` 的解析。
4. 小程序错题写入 API。
5. 错题详情 API 与错题列表分页/搜索增强。

---

# 3. 总体架构

## 3.0 小程序技术栈

小程序 V1 采用：

```text
Taro + React + TypeScript
```

不采用原生微信小程序作为主要开发方式。

选择 Taro 的原因：

- 当前 Web 项目已经是 React / TypeScript 技术栈，团队可以沿用相同的组件化思路和类型约束。
- Taro 的页面、组件、服务模块拆分方式更接近现有 Web 项目，便于复用当前文档中的组件边界和业务服务分层思路。
- 相比直接使用原生 WXML/WXSS/JS，Taro 能降低学习成本，减少前端工程心智切换。

## 3.1 推荐架构

继续使用当前 Next.js 项目作为 Web 后台和小程序后端 API：

```text
微信小程序
  -> wx.login 获取 code
  -> Next.js API /api/wechat/login
  -> 后端换取 openid
  -> 后端签发小程序 session token
  -> 小程序后续请求携带 session token
  -> Next.js API 解析 session token 为 userId
  -> 复用 services/student/*
  -> Supabase Postgres
```

核心原则：

- Web 后台继续使用 Supabase Auth cookie。
- 小程序使用独立的 `openid + session token`。
- 小程序 session 解析出已有学习数据使用的 `userId`。
- 学习业务表继续沿用当前 `user_id uuid references auth.users(id)` 结构。
- 不把小程序用户伪装成浏览器 Supabase cookie 用户。

## 3.2 `openid` 与 `userId` 的关系

推荐采用“明确映射”方案：

- `openid` 是微信侧身份，只用于识别同一个微信用户。
- `userId` 是当前学习业务表使用的学生 ID，继续对应 `auth.users.id`。
- 新增绑定表将 `openid` 绑定到一个学生 `user_id`。
- 小程序接口拿到 session token 后，只把它解析成 `userId`，再调用已有服务层。

这样可以最大化复用 `mistakes`、`review_tasks`、`practice_sessions`、`practice_records`、`weak_practice_tasks` 等现有表和服务。

## 3.3 小程序学生 `userId` 来源

当前学习业务表依赖 `user_id`，并且引用 `auth.users(id)`。小程序 V1 不采集学生手机号、邮箱、微信号、微信昵称、头像、真实姓名等身份信息，因此不能让学生端现场填写个人身份来创建业务用户。

V1 决策：

- 教师端或后台先生成内部学生账号，即 `student_user_id`。
- 邀请码绑定到这个内部学生账号。
- 微信 `openid` 只绑定到该内部 `userId`，用于后续自动识别同一微信用户。
- 学生端不展示 `openid`，也不展示真实身份信息。
- 如果后续希望在学生首次绑定时自动创建内部学生账号，需要另起设计，明确账号创建、教师归属、授权期限、重复绑定和后台管理规则；本文档 V1 不做模糊处理。

---

# 4. 数据库计划

## 4.1 新增表

### `student_invite_codes`

用途：教师为学生生成绑定邀请码。

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id uuid primary key` | 邀请码 ID |
| `code text unique not null` | 学生输入的邀请码 |
| `student_user_id uuid references auth.users(id)` | 邀请码对应的学生账号 |
| `teacher_user_id uuid references auth.users(id)` | 创建邀请码的教师或管理员 |
| `status text` | `active` / `used` / `disabled` / `expired` |
| `invite_expires_at timestamptz` | 邀请码本身过期时间 |
| `subscription_expires_at timestamptz` | 学生绑定后授权到期时间 |
| `subscription_days integer` | 可选，学生绑定后授权天数；与 `subscription_expires_at` 二选一 |
| `used_at timestamptz` | 使用时间 |
| `created_at timestamptz` | 创建时间 |
| `updated_at timestamptz` | 更新时间 |

约束：

- `status` 只能取允许枚举值。
- `code` 唯一。
- 一个邀请码绑定一个学生账号。
- `invite_expires_at` 只控制邀请码能否继续被使用。
- 学生授权期限来自 `subscription_expires_at` 或 `subscription_days`，不能和邀请码本身过期时间混用。
- 是否允许同一学生生成多个未使用邀请码，需要在教师端管理策略中限制；V1 可先用代码逻辑限制。

### `student_wechat_bindings`

用途：保存 `openid` 与学生账号的绑定关系。

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id uuid primary key` | 绑定 ID |
| `openid text unique not null` | 微信 openid |
| `user_id uuid references auth.users(id)` | 绑定到的学生账号 |
| `invite_code_id uuid references student_invite_codes(id)` | 来源邀请码 |
| `bound_at timestamptz` | 绑定时间 |
| `last_login_at timestamptz` | 最近登录时间 |
| `status text` | `active` / `disabled` |
| `created_at timestamptz` | 创建时间 |
| `updated_at timestamptz` | 更新时间 |

约束：

- 一个 `openid` 只绑定一个学生。
- V1 建议一个 `user_id` 也只允许一个 active 微信绑定，避免学生资格被多人共用。
- 禁用后不删除历史绑定，方便排查。

### `student_subscriptions`

用途：保存小程序学生端授权状态。

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id uuid primary key` | 授权 ID |
| `user_id uuid references auth.users(id)` | 学生账号 |
| `status text` | `active` / `expired` / `disabled` |
| `starts_at timestamptz` | 授权开始时间 |
| `expires_at timestamptz` | 授权到期时间 |
| `source text` | `invite_code` 等来源 |
| `created_at timestamptz` | 创建时间 |
| `updated_at timestamptz` | 更新时间 |

约束：

- 每个学生同一时间建议只有一个 active 授权。
- `expires_at` 用于“我的”页和接口拦截，其值应来自邀请码配置的授权期限，即 `student_invite_codes.subscription_expires_at` 或按 `subscription_days` 从绑定时间计算，而不是来自 `invite_expires_at`。
- 授权过期或禁用时，首页以外页面需要提示不可用并引导联系老师。

## 4.2 RLS 与 service role

新增小程序身份表建议启用 RLS，但小程序登录、绑定、授权校验由服务端 API 使用 service role 或受控 server client 访问。

注意事项：

- `SUPABASE_SERVICE_ROLE_KEY` 仍只能服务端使用。
- 不要把 service role 暴露给小程序。
- 学习业务写入仍必须显式带 `user_id`，不能依赖 `auth.uid()`，因为小程序请求没有 Supabase Auth cookie。

## 4.3 类型更新

新增 migration 后需要更新：

- `types/database.ts`
- 小程序身份相关 service 的类型定义
- API response 类型

---

# 5. 后端服务层计划

## 5.1 新增小程序身份服务

建议新增：

```text
services/wechat-auth.ts
services/student/session.ts
```

职责拆分：

- `services/wechat-auth.ts`
  - 用 `code` 调微信接口换取 `openid`。
  - 不保存业务状态，只处理微信身份交换。

- `services/student/session.ts`
  - 创建、校验小程序 session token。
  - 根据 token 解析 `openid`、`binding`、`userId`、`subscription`。
  - 更新 `last_login_at`。
  - 判断授权是否 active。

session token 推荐：

- V1 可用后端签名的不透明 token。
- token 中不放敏感学习数据。
- 服务端校验签名、过期时间和绑定状态。
- 需要新增环境变量，例如 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`、`MINI_PROGRAM_SESSION_SECRET`。

## 5.2 新增小程序 API 鉴权工具

保留现有 `requireStudentApiUser()` 给 Web/Supabase cookie 使用。

新增小程序鉴权函数，例如：

```text
app/api/student/_utils.ts
  requireStudentApiUser()
  requireMiniProgramStudent()
```

或拆出：

```text
app/api/_utils/student-auth.ts
```

`requireMiniProgramStudent()` 返回：

```ts
{
  ok: true;
  userId: string;
  openid: string;
  subscriptionStatus: "active" | "expired" | "disabled" | "unbound";
}
```

错误码建议：

- `UNAUTHORIZED`：无 token 或 token 无效。
- `UNBOUND`：已登录微信但未绑定邀请码。
- `SUBSCRIPTION_EXPIRED`：授权过期。
- `SUBSCRIPTION_DISABLED`：授权禁用。
- `FORBIDDEN`：不是学生资格或访问越权。

## 5.3 复用现有学生服务

小程序后端不要重写学习业务。鉴权后拿到 `userId`，继续调用：

- `getStudentDashboardData(userId)`
- `getTodayReviewTasks(userId)`
- `completeTodayReviewTask({ userId, taskId, result })`
- `getTodayWeakPracticeData(userId)`
- `completeWeakPracticeTask({ userId, taskId, result })`
- `getPracticeOptions()`
- `createPracticeSession({ userId, questionTypeId })`
- `getPracticeSession(userId, sessionId)`
- `completePracticeRecord({ userId, recordId, result })`
- `addPracticeMistakes({ userId, sessionId, recordIds })`
- `getStudentMistakesListPage(...)`
- `getStudentMistakeAnswerData({ mistakeId, userId, canManage: false })`

需要注意：这些服务内部使用 `createClient()` 时，当前 Supabase client 不具备 `auth.uid()`。对小程序请求，如果查询依赖 RLS 且没有 Supabase cookie，可能被 RLS 拦截。实现时有两条路径：

1. 对小程序专用服务改为使用 service role client，并且每个查询显式 `.eq("user_id", userId)`。
2. 保留现有 Web 服务，新增小程序 service wrapper，内部使用 service role client 调用相同查询逻辑。

推荐 V1 采用第 2 种：先保留 Web 不动，对小程序新增最小 wrapper，避免破坏现有 Web Auth 行为。

---

# 6. API 计划

## 6.1 微信登录与绑定

### `POST /api/wechat/login`

请求：

```json
{
  "code": "wx.login 返回的 code"
}
```

流程：

1. 校验 `code`。
2. 后端请求微信 `jscode2session` 换取 `openid`。
3. 查询 `student_wechat_bindings`。
4. 如果未绑定，签发未绑定态 session，返回 `bindingStatus = "unbound"`。
5. 如果已绑定，解析 `userId` 和授权状态，更新 `last_login_at`。
6. 返回 session token、绑定状态、授权状态。

响应：

```json
{
  "ok": true,
  "data": {
    "sessionToken": "...",
    "bindingStatus": "bound",
    "subscriptionStatus": "active"
  }
}
```

### `POST /api/wechat/bind-invite-code`

请求：

```json
{
  "inviteCode": "ABC123"
}
```

鉴权：

- 需要携带未绑定或已绑定的小程序 session token。

流程：

1. 从 token 解析 `openid`。
2. 校验邀请码存在、active、未过期、未使用。
3. 校验目标用户是学生。
4. 创建或更新 `student_wechat_bindings`。
5. 标记邀请码 `used`。
6. 创建或激活 `student_subscriptions`。
7. 返回新的绑定状态和授权状态。

### `GET /api/student/me`

用途：我的页学习统计和身份摘要。

返回：

- 绑定状态。
- 授权状态。
- 绑定时间。
- 到期时间。
- 错题总数。
- 已复习数。
- 专项训练数。

### `GET /api/student/subscription-status`

用途：页面级授权拦截和“我的”页授权卡片。

返回：

- `status`
- `boundAt`
- `startsAt`
- `expiresAt`
- 是否允许继续访问学习页面。

## 6.2 现有学习 API 适配

已有接口需要支持小程序 session：

| API | 处理 |
| --- | --- |
| `GET /api/student/dashboard` | 小程序鉴权后复用 dashboard service |
| `GET /api/student/reviews` | 小程序鉴权后复用 reviews service |
| `POST /api/student/reviews/[taskId]/complete` | 小程序鉴权后复用完成逻辑 |
| `GET /api/student/weak-practice` | 小程序鉴权后生成或读取今日 5 题 |
| `POST /api/student/weak-practice/[taskId]/complete` | 小程序鉴权后复用完成逻辑 |
| `GET /api/student/practice/options` | 小程序鉴权后返回题型树和可练题量 |
| `POST /api/student/practice/sessions` | 小程序鉴权后创建 5 题训练 |
| `GET /api/student/practice/sessions/[sessionId]` | 小程序鉴权后读取 session |
| `POST /api/student/practice/records/[recordId]/complete` | 小程序鉴权后保存掌握状态 |
| `POST /api/student/practice/sessions/[sessionId]/add-mistakes` | 小程序鉴权后加入错题库 |
| `GET /api/student/solutions?mistakeId=...` | 小程序鉴权后读取错题答案 |

适配方式：

- 短期可以在同一路由中同时支持 Supabase cookie 和 `Authorization: Bearer <mini token>`。
- 更稳妥的方式是拆鉴权工具，让路由先尝试小程序 token，再回退 Web cookie。
- 返回结构继续使用 `{ ok, data }` / `{ ok, error }`。

## 6.3 新增错题 API

### `POST /api/student/mistakes/recommend-types`

用途：错题录入页获取 Top 3 推荐题型。

请求：

```json
{
  "inputType": "latex",
  "latexContent": "\\int x dx",
  "rawText": ""
}
```

处理：

- 复用 `services/classifier.ts`。
- 复用 `services/latex.ts` 的分类文本入口。
- 题型和例题从 `question_types`、`question_type_examples` 读取。

返回：

- 推荐题型 ID。
- level1 / level2 / level3。
- score。
- matchedKeywords。
- confidence 文案所需字段。

### `POST /api/student/mistakes`

用途：错题录入页直接加入错题库或提交教师审核。

请求：

```json
{
  "inputType": "latex",
  "latexContent": "...",
  "rawText": "",
  "questionTypeId": "uuid 或 null",
  "submitForReview": false,
  "note": "可选"
}
```

规则：

- `submitForReview = false` 时必须有 `questionTypeId`。
- 直接加入错题库：
  - `classification_status = student_selected`
  - `classified_by = student`
  - `question_type_id` 不为空
  - 创建 1、3、7、14、30 天复习任务
- 提交教师审核：
  - `classification_status = pending`
  - `question_type_id = null`
  - 不创建复习任务
- 必须保留教师审核兜底，不允许在小程序端删掉 pending 流程。

实现建议：

- 把 `app/(app)/mistakes/actions.ts` 中保存错题和创建复习任务的核心逻辑抽到 service。
- Web Server Action 和小程序 API 共用同一个 service，避免两套规则分叉。

### `GET /api/student/mistakes/[id]`

用途：错题详情页。

返回：

- 错题题干、LaTeX 展示字段、题型、分类状态。
- 当前掌握状态。
- 学习记录时间线。
- 答案解析入口所需 `mistakeId`。

学习记录 V1 可先从 `review_tasks` 的 completed 历史聚合。

### 增强 `GET /api/student/mistakes`

当前接口只支持 `questionTypeId` 简单筛选。V1 错题本需要：

- `keyword`
- `page`
- `pageSize`
- `questionTypeId`
- `level1`
- `level2`
- `level3`
- `status`

可复用 `services/student/mistakes.ts` 中已有的 `getStudentMistakesListPage()`。

## 6.4 可选答案 API 增强

`GET /api/student/solutions?problemId=...`

用途：从专项训练和薄弱巩固进入统一答案解析页。

V1 可以先不做此接口，因为专项训练和薄弱巩固的任务 API 已返回 `answer` / `analysis`。如果前端希望答案解析页完全统一，建议补充该接口。

---

# 7. 小程序前端计划

## 7.1 工程位置

当前仓库没有小程序前端工程。V1 使用 Taro + React + TypeScript，建议新增独立目录，例如：

```text
mini-program/
  src/
    app.tsx
    app.config.ts
    pages/
    components/
    services/
    utils/
```

该目录与现有 Next.js Web 并行，不混入 `app/`。

## 7.2 页面路由

按最终规范实现：

```text
src/pages/home/index
src/pages/review/index
src/pages/weak-practice/index
src/pages/practice/index
src/pages/practice/session
src/pages/practice/summary
src/pages/mistake/ai-helper
src/pages/mistake/new
src/pages/mistake/index
src/pages/mistake/detail
src/pages/solution/detail
src/pages/profile/index
```

TabBar 固定 5 项：

- 首页
- 复习
- 巩固
- 错题
- 我的

## 7.3 前端服务模块

建议封装：

```text
mini-program/src/services/http.ts
mini-program/src/services/auth.ts
mini-program/src/services/dashboard.ts
mini-program/src/services/reviews.ts
mini-program/src/services/weak-practice.ts
mini-program/src/services/practice.ts
mini-program/src/services/mistakes.ts
mini-program/src/services/solutions.ts
```

`http.ts` 统一处理：

- base URL。
- session token 注入。
- `{ ok, data }` / `{ ok, error }` 解析。
- `UNAUTHORIZED`、`UNBOUND`、`SUBSCRIPTION_EXPIRED` 的跳转。
- loading、toast、重复提交保护。

## 7.4 组件拆分

全局组件：

- `AppTopBar`
- `BrandHeader`
- `BottomTabBar`
- `PrimaryButton`
- `SecondaryButton`
- `StatusTag`
- `MetricCard`
- `LatexRenderer`
- `QuestionNavigator`
- `AnswerButton`
- `FilterChip`
- `CheckboxRow`

页面组件：

- `CountdownCard`
- `QuickActionGrid`
- `WeakTopList`
- `SevenDayStatsGrid`
- `WeakPracticeTaskCard`
- `PromptTypeGrid`
- `PromptTemplateCard`
- `LatexShortcutBar`
- `TypeRecommendationGroup`
- `TeacherReviewFallback`
- `PracticeCategoryAccordion`
- `PracticeTypeCard`
- `TrainingSummaryCard`
- `MistakeTimeline`
- `SolutionSectionCard`

## 7.5 LaTeX 展示

LaTeX 渲染 POC 已完成，详见 `docs/MINI_PROGRAM_LATEX_POC.md`。

当前 V1 推荐方案：

- 暂时采用方案 A：小程序端 `LatexRenderer` 受控解析 + 渲染失败降级显示。
- 方案 B：转换为 HTML / RichText nodes 后通过 Taro `RichText` 或小程序富文本展示，仅作为备选方案。
- 方案 B 仍需要在微信开发者工具和真机中继续验证，尤其是 RichText 内联样式、复杂节点结构和横向滚动的兼容性。

小程序必须支持：

- 标准数学公式。
- `\frac{}{}`
- `\sqrt{}`
- `\int`
- `\sum`
- `\lim`
- `\sin`
- `\cos`
- `\infty`
- `\blankbox`
- `\fourchoices`
- `\_\_\_`
- 连续 3 个及以上下划线。
- 长公式横向滚动。
- 渲染失败时显示原始 LaTeX 文本或 `stem`。

当前 POC 已验证：

- `\frac`、`\sqrt`、`\int`、`\sum`、`\lim`、`\sin`、`\cos`、`\infty`。
- `\blankbox`。
- `\fourchoices`。
- 填空题下划线。
- 长公式横向滚动。
- 失败降级显示。

前端展示规则：

1. 优先显示 API 返回的 `displayLatex`。
2. 没有 `displayLatex` 时使用 `raw_latex` 或 `latex_content`。
3. 渲染失败时降级显示原始文本或 `stem`。
4. 长公式区域允许横向滚动，不能挤出屏幕。

当前限制：

- POC 不是完整 LaTeX 引擎。
- 上下标仍是普通文本展示。
- 矩阵、分段函数、方程组暂不支持。
- `\fourchoices` 中复杂公式目前偏纯文本展示，后续若要高保真排版需要继续增强。

正式接入顺序：

1. 今日复习。
2. 薄弱巩固。
3. 专项训练。
4. 错题录入实时预览。
5. 错题本。
6. 错题详情。
7. 答案解析。

实现风险：

- Web 当前使用 KaTeX，微信小程序原生环境不能直接复用 React 组件。
- 正式 Taro 工程初始化后，必须使用微信开发者工具验证 POC 页面实际显示效果，并在真机上复核长公式滚动、`\blankbox`、`\fourchoices` 和失败降级。
- 不要改变后端存储字段来适配渲染装饰。

---

# 8. 页面技术方案

## 8.1 首页

API：

- `GET /api/student/dashboard`
- `GET /api/student/subscription-status`

数据映射：

- 今日待复习：`pendingTodayCount`
- 薄弱巩固：`weakPracticeTotalCount`、`weakPracticeCompletedCount`
- 薄弱考点 Top 5：`weakQuestionTypes`
- 近 7 日数据：`sevenDaySummary`
- 考试倒计时：前端按固定日期 `2027-03-21` 计算

P1 补充：

- 专项训练状态卡如果需要真实“今日是否开始”，可扩展 dashboard 返回最近 active/completed session。

## 8.2 今日复习

API：

- `GET /api/student/reviews`
- `POST /api/student/reviews/[taskId]/complete`
- `GET /api/student/solutions?mistakeId=...`

前端状态：

- 当前题索引。
- 每题本地完成状态。
- 已掌握/未掌握提交 loading。
- 全部完成后的完成态。

规则：

- 一次只展示一道题。
- 题号可自由切换。
- 未掌握会由后端追加 `retry_day3`、`retry_day7`。

## 8.3 薄弱巩固

API：

- `GET /api/student/weak-practice`
- `POST /api/student/weak-practice/[taskId]/complete`

规则：

- 进入页面时读取或生成今日 5 题。
- 一次只展示一道题。
- 反馈为“仍需巩固”或“已掌握”。
- 不输入答案，不自动批改。

## 8.4 专项训练

API：

- `GET /api/student/practice/options`
- `POST /api/student/practice/sessions`
- `GET /api/student/practice/sessions/[sessionId]`
- `POST /api/student/practice/records/[recordId]/complete`
- `POST /api/student/practice/sessions/[sessionId]/add-mistakes`

规则：

- 题型选择必须选中三级题型后才能开始。
- 每次训练固定 5 题。
- 完成 5 题后进入 summary。
- summary 默认勾选所有未掌握题。
- 加入错题库只处理勾选的未掌握题。
- 已加入过的题不得重复加入。

P1 补充：

- `PracticeRecordView.problem` 当前未返回 `problemType`，如 UI 必须展示“单选题”等，需要扩展 service 和 API。

## 8.5 AI 录题助手

不需要后端 API。

前端静态实现：

- 选择题、填空题、计算题、证明题 4 类提示词模板。
- 复制提示词到剪贴板。
- 推荐 AI 工具标签只展示，不跳转。

明确不做：

- 上传图片。
- 调用 AI API。
- 保存图片。

## 8.6 错题录入

API：

- `POST /api/student/mistakes/recommend-types`
- `POST /api/student/mistakes`
- 题型手动选择可复用 `GET /api/student/practice/options` 或新增轻量题型树 API。

规则：

- V1 只支持 LaTeX 输入。
- 实时预览由前端处理。
- LaTeX 为空时禁用提交。
- 推荐题型可选中，也可手动覆盖。
- 高置信度且已选题型时主按钮为“直接加入错题库”。
- 低置信度、未推荐明确题型或学生点击“不确定题型”时，主流程必须允许“提交教师审核”。

## 8.7 错题本

API：

- 增强 `GET /api/student/mistakes`
- `GET /api/student/mistakes/[id]`

规则：

- 支持关键词搜索。
- 支持题型胶囊筛选。
- 支持分页或下拉加载。
- 列表到底显示“已经到底啦”。

P1 补充：

- 完整复习状态、下一轮 Day 信息、掌握度需要聚合 `review_tasks` 后返回。

## 8.8 错题详情

API：

- `GET /api/student/mistakes/[id]`
- `GET /api/student/solutions?mistakeId=...`

规则：

- 只读。
- 展示题目、当前掌握状态、学习记录时间线。
- 查看答案解析时携带来源上下文。

## 8.9 答案解析

API：

- 错题来源：`GET /api/student/solutions?mistakeId=...`
- 专项训练/薄弱巩固来源：可先使用当前任务数据中的 `answer` / `analysis`
- 可选统一：`GET /api/student/solutions?problemId=...`

规则：

- 只读。
- 无答案解析时显示空状态，不伪造内容。
- 知识点标签 V1 可用题型路径替代。
- 学习建议 V1 用静态文案或题型模板，不新增字段。
- 返回按钮文案根据来源变化。

## 8.10 我的

API：

- `GET /api/student/me`
- `GET /api/student/subscription-status`

规则：

- 不展示手机号、邮箱、微信号、微信昵称、头像、真实姓名、openid。
- 展示授权状态、绑定时间、到期时间。
- 学习统计包括错题总数、已复习、专项训练。
- 退出登录只清除小程序本地 session token，不影响 Web Supabase 登录。

---

# 9. 实施顺序

## P0-0 LaTeX 渲染 POC

Taro 小程序环境下的 LaTeX 渲染 POC 已完成，结论记录在 `docs/MINI_PROGRAM_LATEX_POC.md`。页面开发前仍需在正式 Taro 工程初始化后，使用微信开发者工具和真机验证该 POC 页面的实际显示效果。

当前 V1 推荐：

- 暂时采用方案 A：小程序端 `LatexRenderer` 受控解析 + 降级显示。
- 方案 B：RichText nodes 渲染仅作为备选，继续等待微信开发者工具和真机验证。

验证内容：

1. 标准公式。
2. `\frac{}{}`。
3. `\sqrt{}`。
4. `\int`。
5. `\sum`。
6. `\lim`。
7. `\sin`。
8. `\cos`。
9. `\infty`。
10. `\blankbox`。
11. `\fourchoices`。
12. 填空下划线。
13. 长公式横向滚动。
14. 渲染失败时降级显示原始文本。

验收：

- POC 页面中可以展示上述公式和自定义命令。
- 长公式不撑破屏幕，公式区域可横向滚动。
- 渲染失败时能显示原始文本或 `stem`，页面不白屏、不阻塞后续操作。
- POC 结论已写入 `docs/MINI_PROGRAM_LATEX_POC.md`。
- 正式 Taro 工程初始化后，必须在微信开发者工具和真机中复核 POC 页面，再进入大规模页面接入。

## P0-1 正式 Taro 工程第一阶段

正式 Taro 工程已进入第一阶段。

当前阶段只完成：

1. `mini-program` 正式 Taro + React + TypeScript 工程骨架。
2. 五项 TabBar： 首页、复习、巩固、错题、我的。
3. 首页静态 mock 页面。
4. 首页全局视觉基础：米白背景、深绿色主色、白底卡片、圆角、轻边框、纵向卡片流。
5. 保留 `latex-poc` 页面和 `LatexRenderer` POC 组件，继续用于后续公式渲染验证。

当前阶段明确不做：

- 不接后端 API。
- 不做微信登录。
- 不做邀请码绑定。
- 不改 Supabase schema。
- 不改 Web 学生端或教师端。
- 不实现今日复习、薄弱巩固、专项训练、错题录入等业务页面。

后续页面实现顺序：

1. 今日复习。
2. 薄弱巩固。
3. 专项训练题型选择、训练题目、训练完成。
4. AI 录题助手。
5. 错题录入实时预览与题型推荐入口。
6. 错题本。
7. 错题详情。
8. 答案解析。
9. 我的页授权状态与设置。

## P0-2 身份与授权

1. 新增 `student_invite_codes`、`student_wechat_bindings`、`student_subscriptions` migration。
2. 更新 `types/database.ts`。
3. 新增微信登录服务和小程序 session 服务。
4. 实现 `POST /api/wechat/login`。
5. 实现 `POST /api/wechat/bind-invite-code`。
6. 实现 `GET /api/student/subscription-status`。
7. 实现 `GET /api/student/me`。

验收：

- 未绑定用户登录后返回 `unbound`。
- 输入有效邀请码后绑定成功。
- 绑定后再次登录可直接进入学习页面。
- 授权过期或禁用时能被 API 拦截。

## P0-3 学习 API 鉴权适配

1. 新增小程序鉴权 wrapper。
2. 改造或复制现有 `/api/student/*` 路由，使其支持小程序 session token。
3. 对小程序路径使用 service role + 显式 `user_id` 过滤，避免 RLS 依赖 cookie。
4. 保持 Web Supabase cookie 路径不回归。

验收：

- 小程序 token 可访问 dashboard、reviews、weak-practice、practice、solutions。
- 不同学生的 token 不能访问彼此数据。
- Web 页面原有登录态仍能访问现有功能。

## P0-4 错题录入与错题详情

1. 将 Web 错题保存核心逻辑抽到 service。
2. 实现 `POST /api/student/mistakes/recommend-types`。
3. 实现 `POST /api/student/mistakes`。
4. 实现 `GET /api/student/mistakes/[id]`。
5. 增强 `GET /api/student/mistakes` 支持分页、搜索、筛选。

验收：

- 直接加入错题库会创建复习任务。
- 提交教师审核不会创建复习任务。
- 教师 Web 审核后仍能生成复习任务。
- 错题详情只允许查看自己的错题。

## P0-5 小程序前端闭环

1. 初始化 Taro + React + TypeScript 小程序工程目录。
2. 实现登录、绑定、授权拦截。
3. 实现 TabBar 和全局视觉基础。
4. 实现首页。
5. 实现今日复习。
6. 实现薄弱巩固。
7. 实现专项训练选择、做题、总结。
8. 实现 AI 录题助手。
9. 实现错题录入。
10. 实现错题本、错题详情、答案解析。
11. 实现我的页。

验收：

- 学生从首次进入到绑定、学习、录错题、复习、训练、查看解析形成闭环。
- UI 模块不增加最终规范未定义的模块。
- 页面状态覆盖加载、空状态、错误、未登录、未绑定、授权过期。

## P1 增强

1. practice session API 返回 `problemType`。
2. practice options 返回题型掌握度。
3. dashboard 返回今日专项训练状态。
4. 错题本返回复习周期、最近/下次复习、掌握状态聚合。
5. 错题详情返回更完整学习记录时间线。
6. 新增 `GET /api/student/solutions?problemId=...`，统一训练/巩固答案页。

## P2 低风险 UI 项

1. 收藏图标先隐藏或作为无业务装饰。
2. 学习建议使用静态文案。
3. 推荐 AI 工具标签静态展示。
4. 品牌图标、水印、标签样式不进数据库。

---

# 10. 测试与验收

## 10.1 后端测试

重点覆盖：

- 微信登录 code 交换失败。
- 未绑定 session。
- 邀请码不存在、过期、禁用、已使用。
- 绑定成功后生成授权。
- 授权过期拦截。
- 小程序 token 越权访问其他学生数据。
- 错题直接保存创建复习任务。
- 错题提交教师审核不创建复习任务。
- 复习未掌握追加 retry 任务。
- 专项训练未掌握题加入错题库去重。

## 10.2 前端验收

页面状态：

- loading。
- 空状态。
- 错误状态。
- 未登录。
- 未绑定邀请码。
- 授权过期。
- 正常数据。
- 提交中防重复点击。

设备适配：

- 手机纵向卡片流。
- 底部固定操作区避开安全区。
- TabBar 固定底部。
- LaTeX 长公式横向滚动。
- 点击区域不低于 44px。

## 10.3 回归命令

每次代码实现后运行：

```bash
npm.cmd run lint
npm.cmd run build
```

如果小程序目录引入独立工具链，需要补充对应构建或类型检查命令。

---

# 11. 风险与决策点

## 11.1 微信 API 环境变量

需要新增并配置：

- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`
- `MINI_PROGRAM_SESSION_SECRET`

这些只能服务端使用。

## 11.2 RLS 与 service role

小程序没有 Supabase cookie，现有 server client 查询可能受 RLS 影响。实现时必须确认每条小程序服务路径使用显式 `user_id` 过滤，并选择合适的 server/service role client。

## 11.3 邀请码管理入口

V1 小程序学生端依赖邀请码，但当前文档和代码没有教师端邀请码管理实现。后续实现时需要在 Web 教师后台补一个最小管理入口，或先通过后台脚本/数据库生成邀请码。正式上线建议提供教师 Web 页面。

## 11.4 LaTeX 小程序渲染

Web 的 KaTeX React 组件不能直接搬到 Taro 小程序。LaTeX 渲染 POC 已完成，V1 暂时采用小程序端 `LatexRenderer` 受控解析 + 降级显示；RichText nodes 方案保留为备选。正式 Taro 工程初始化后，必须使用微信开发者工具和真机继续验证 POC 页面的实际显示效果，重点复核 `\frac`、`\sqrt`、`\int`、`\sum`、`\lim`、`\sin`、`\cos`、`\infty`、`\blankbox`、`\fourchoices`、填空下划线、长公式横向滚动和失败降级。

## 11.5 题型推荐置信度

当前 classifier 返回 score，但“高/低置信度”阈值未在代码中固化。V1 可先按 80% 作为前端阈值，但最终阈值应在真实题型数据上校验。

## 11.6 不要扩大数据模型

以下内容 V1 不建表：

- 收藏。
- 知识点标签。
- 学习建议字段。
- 图标、水印、视觉配置。

---

# 12. 最小可交付切片

为了降低风险，建议按以下切片交付：

1. 身份切片：微信登录、邀请码绑定、授权状态、我的页最小展示。
2. 复习切片：首页 + 今日复习 + 答案解析。
3. 巩固切片：薄弱巩固 + 专项训练 + 训练总结加入错题库。
4. 错题切片：AI 录题助手 + 错题录入 + 错题本 + 错题详情。
5. 完整状态切片：空状态、错误状态、授权过期、UI 细节、LaTeX 边界。

每个切片都应保持 Web 后台不回归。
