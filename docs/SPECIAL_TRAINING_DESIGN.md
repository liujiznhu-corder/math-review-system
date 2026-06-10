# 专项训练模块设计

## 1. 产品目标

专项训练模块用于让学生主动选择题型进行刷题，解决“我知道自己想练哪一类题，但系统每日推荐不一定覆盖”的问题。

当前系统已有：

- 错题录入
- 教师审核
- 教师题库
- 答案解析
- 今日复习
- 薄弱巩固
- Dashboard

专项训练和现有模块的关系：

- 今日复习：按遗忘周期推送学生自己的错题。
- 薄弱巩固：系统每天自动推荐教师题库题目。
- 专项训练：学生主动选择题型，从教师题库中抽题练习。

核心目标：

- 支持学生按一级 / 二级 / 三级题型主动刷题。
- 复用教师题库 `problems`，优先选择有答案解析的题目。
- 训练结果能反馈到学生掌握度、薄弱题型和后续推荐。
- V1 先做轻量闭环，避免过度设计和重构现有复习体系。

---

## 2. 页面结构

路由：

```text
/practice
```

页面建议分为三个状态：

### 2.1 训练入口状态

学生进入 `/practice` 后，默认看到题型选择和训练配置。

模块：

- 一级分类选择
- 二级分类选择
- 三级题型选择
- 题目数量，V1 默认 5 题
- 开始训练按钮

交互原则：

- 一级 / 二级 / 三级题型使用级联选择。
- 学生可以只选一级分类或二级分类，系统从该范围内抽题。
- 如果选择到三级题型，则优先从该精确题型抽题。
- 如果题库题量不足，页面需要提示“题库题量不足，已为你补充同分类题目”。

### 2.2 训练进行状态

学生点击“开始训练”后进入训练流。

模块：

- 当前题号，例如 `第 1 / 5 题`
- 题目 LaTeX 渲染
- 所属题型
- 查看答案按钮
- 已掌握 / 未掌握按钮
- 下一题按钮

### 2.3 训练完成状态

学生完成本次训练后展示结果摘要。

模块：

- 本次训练总题数
- 已掌握数量
- 未掌握数量
- 涉及题型
- 再练一次
- 返回首页 / 返回专项训练入口

---

## 3. 训练入口

专项训练入口围绕题型树展开。

筛选维度：

- 一级分类
- 二级分类
- 三级题型

选择规则：

- 未选择一级分类时，展示全部可选分类。
- 选择一级分类后，二级分类只展示该一级分类下的二级分类。
- 选择二级分类后，三级题型只展示该二级分类下的题型。
- 选择三级题型后，抽题范围精确到该 `question_type_id`。

题目数量：

- V1 默认 5 题。
- V1 可以暂不开放数量选择。
- V2 可支持 5 / 10 / 15 题。

入口位置建议：

- Web 学生端：学生导航新增“专项训练”，链接到 `/practice`。
- 小程序端：放在“巩固”Tab 内，作为“专项训练”入口。
- Dashboard：可增加“专项训练”快捷卡片，但 V1 不是必须。

---

## 4. 抽题策略

默认抽题数量：

```text
5 题
```

题目来源：

```text
problems
```

基础条件：

- `problems.question_type_id` 不为空。
- 题目属于学生选择的题型范围。
- 优先抽取 `answer` 或 `analysis` 有内容的题目。

抽题范围：

### 4.1 选择三级题型

优先从该 `question_type_id` 抽题。

如果不足 5 题：

1. 先从同二级分类下其他三级题型补足。
2. 再从同一级分类下其他题型补足。
3. 最后从全题库随机补足。

### 4.2 选择二级分类

从该二级分类下所有三级题型中抽题。

如果不足 5 题：

1. 从同一级分类下其他二级分类补足。
2. 再从全题库随机补足。

### 4.3 选择一级分类

从该一级分类下所有题型中抽题。

如果不足 5 题：

1. 从全题库随机补足。

### 4.4 未选择题型

V1 不建议支持“完全不选就开始训练”。学生如果想随机练习，应通过“薄弱巩固”或后续“随机挑战”入口进入。

去重策略：

- 同一个训练 session 内不重复抽同一道题。
- V1 可不做跨 session 去重。
- V2 可增加“近 7 天练过的题优先不重复”。

排序策略：

- V1 可随机排序。
- V2 可按“有答案解析优先 + 近 30 天未练过优先 + 题型薄弱度”综合排序。

---

## 5. 训练流程

```text
开始训练
↓
查看题目
↓
查看答案
↓
已掌握 / 未掌握
↓
下一题
```

详细流程：

1. 学生选择题型范围。
2. 点击“开始训练”。
3. 系统创建一次训练 session，并抽取默认 5 题。
4. 学生逐题查看题目。
5. 学生点击“查看答案”。
6. 页面展示答案和解析。
7. 学生选择“已掌握”或“未掌握”。
8. 系统记录本题训练结果。
9. 进入下一题。
10. 全部完成后展示训练总结。

交互要求：

- 未查看答案前是否允许提交掌握反馈，V1 可以允许，但建议按钮文案提示“建议先看答案再反馈”。
- 提交反馈后当前题结果锁定，避免误点反复提交。
- 允许学生返回上一题查看，但 V1 不必支持修改已提交结果。

---

## 6. 掌握度影响

专项训练结果应影响学生学习统计，但影响方式需要和“今日复习”区分。

### 6.1 对 Dashboard 的影响

Dashboard 可以新增或扩展：

- 今日专项训练完成数
- 近 7 天专项训练题数
- 专项训练掌握率

V1 最小方案：

- 暂不改 Dashboard 主卡片。
- 专项训练记录进入“最近练习记录”或后续学习报告。

V2 建议：

- Dashboard 学习曲线合并展示复习和专项训练。
- 掌握度图谱同时参考 `review_tasks` 和 `practice_records`。

### 6.2 对 Top5 薄弱题型的影响

当前 Top5 薄弱题型主要基于复习结果和错题记录。

专项训练接入后建议：

- `practice_records.result = not_mastered` 增加该题型薄弱权重。
- `practice_records.result = mastered` 可提升该题型掌握度。

建议权重：

```text
专项训练未掌握次数 * 0.2
专项训练已掌握次数 * -0.1
```

说明：

- 专项训练是学生主动刷题，不应完全等同于错题。
- 未掌握可以提示薄弱，但权重低于真实错题和间隔复习未掌握。

### 6.3 对薄弱巩固的影响

薄弱巩固推荐可以参考专项训练结果。

建议：

- 如果某题型在专项训练中多次 `not_mastered`，薄弱巩固可提高该题型抽题概率。
- 如果某题型连续多次 `mastered`，薄弱巩固可降低该题型权重。

V1 最小方案：

- 先记录专项训练结果，不立刻影响薄弱巩固算法。

V2 增强方案：

- 将专项训练记录纳入 WeaknessScore：

```text
WeaknessScore =
错题数量 * 0.5
+ 复习未掌握次数 * 0.3
+ 最近7天错题数量 * 0.2
+ 专项训练未掌握次数 * 0.2
- 专项训练已掌握次数 * 0.1
```

---

## 7. 数据结构

建议新增：

- `practice_sessions`
- `practice_records`

不建议复用现有 `review_tasks`。

原因：

- `review_tasks` 表示基于错题的间隔复习任务，有明确 `mistake_id`、`review_date` 和 `review_round`。
- 专项训练来自教师题库 `problems`，不是学生错题，不一定有 `mistake_id`。
- 专项训练是学生主动发起，不属于固定复习周期。
- 强行复用 `review_tasks` 会让“今日复习”和“主动刷题”语义混在一起。

### 7.1 practice_sessions

业务作用：

- 表示一次专项训练。
- 记录学生选择的题型范围、题目数量、开始和完成状态。

建议字段：

```text
id uuid primary key
user_id uuid
level1 text nullable
level2 text nullable
question_type_id uuid nullable
question_count integer default 5
status text -- active / completed / abandoned
started_at timestamptz
completed_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

约束建议：

- `status in ('active', 'completed', 'abandoned')`
- `question_count > 0`

RLS：

- 学生只能查看和管理自己的 session。
- teacher/admin V1 不需要管理。

### 7.2 practice_records

业务作用：

- 表示专项训练中的单题记录。
- 记录题目、题型、结果和完成时间。

建议字段：

```text
id uuid primary key
session_id uuid references practice_sessions(id) on delete cascade
user_id uuid
problem_id uuid references problems(id) on delete cascade
question_type_id uuid references question_types(id) on delete set null
position integer
status text -- pending / completed
result text nullable -- mastered / not_mastered
answered_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

约束建议：

- `status in ('pending', 'completed')`
- `result is null or result in ('mastered', 'not_mastered')`
- 同一 session 内 `position` 唯一
- 同一 session 内 `problem_id` 唯一

RLS：

- 学生只能查看和更新自己的 records。
- 插入可以由学生本人通过 API 完成。

### 7.3 是否可以先不建表

V1 如果只做“临时刷题，不纳入统计”，可以不建表，只从 `problems` 抽题返回给前端。

但这会导致：

- 无法记录训练历史。
- 无法影响 Dashboard。
- 无法影响 Top5 薄弱题型。
- 无法影响薄弱巩固。

因此建议 V1 就新增 `practice_sessions` 和 `practice_records`，但保持字段简单。

---

## 8. API设计

API 面向未来小程序和 Web 学生端共用，建议放在：

```text
/api/student/practice
```

统一返回格式：

```json
{
  "ok": true,
  "data": {}
}
```

失败：

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请选择训练题型"
  }
}
```

### 8.1 获取训练入口配置

```text
GET /api/student/practice/options
```

用途：

- 获取可选题型树。
- 获取每个题型可用题目数量。

返回示例：

```json
{
  "ok": true,
  "data": {
    "questionTypes": [],
    "defaultQuestionCount": 5
  }
}
```

### 8.2 创建训练

```text
POST /api/student/practice/sessions
```

请求字段：

```json
{
  "level1": "极限",
  "level2": "函数极限",
  "questionTypeId": "uuid",
  "questionCount": 5
}
```

说明：

- `level1` 可选。
- `level2` 可选。
- `questionTypeId` 可选。
- 至少需要选择一个训练范围。
- V1 `questionCount` 默认 5，可以不开放给用户配置。

返回：

```json
{
  "ok": true,
  "data": {
    "sessionId": "uuid",
    "records": []
  }
}
```

### 8.3 获取训练详情

```text
GET /api/student/practice/sessions/[sessionId]
```

用途：

- 获取训练 session。
- 获取本次训练的题目列表和每题状态。

每题建议返回：

```json
{
  "id": "record-id",
  "position": 1,
  "status": "pending",
  "result": null,
  "problem": {
    "id": "problem-id",
    "displayLatex": "...",
    "answer": "...",
    "analysis": "...",
    "questionType": {}
  }
}
```

### 8.4 提交单题结果

```text
POST /api/student/practice/records/[recordId]/complete
```

请求字段：

```json
{
  "result": "mastered"
}
```

或：

```json
{
  "result": "not_mastered"
}
```

用途：

- 标记单题已完成。
- 记录掌握结果。
- 如果 session 内所有 records 都完成，自动把 session 标记为 `completed`。

### 8.5 获取训练历史

```text
GET /api/student/practice/sessions
```

用途：

- 展示学生历史专项训练。
- V1 可暂不实现。

---

## 9. V1 MVP

V1 目标：

- 学生可以进入 `/practice`。
- 学生可以按题型选择专项训练。
- 系统默认抽 5 题。
- 学生可以逐题查看答案并反馈掌握情况。
- 系统记录 session 和 records。

V1 页面：

- `/practice`

V1 功能范围：

- 题型级联选择。
- 默认 5 题。
- 从教师题库 `problems` 抽题。
- 题目 LaTeX 渲染。
- 答案解析展示。
- 已掌握 / 未掌握反馈。
- 训练完成总结。

V1 数据范围：

- 新增 `practice_sessions`
- 新增 `practice_records`
- 不修改 `review_tasks`
- 不修改 `weak_practice_tasks`

V1 暂不做：

- 训练历史页。
- 题目收藏。
- 错题自动转入 mistakes。
- 与薄弱巩固算法实时联动。
- AI 出题。
- OCR。

V1 验收标准：

- 学生选择一个三级题型后，可以完成一组 5 题训练。
- 如果三级题型不足 5 题，系统可以按同二级、同一级、随机题补足。
- 每题可以查看答案解析。
- 每题可以记录 `mastered` / `not_mastered`。
- 数据只属于当前学生。

---

## 10. 后续扩展

### 10.1 训练历史

增加历史训练页：

- 日期
- 题型范围
- 总题数
- 掌握率
- 查看详情

### 10.2 专项训练影响 Dashboard

Dashboard 增加：

- 今日专项训练题数
- 近 7 天专项训练掌握率
- 专项训练薄弱题型

### 10.3 专项训练影响薄弱巩固

将 `practice_records` 纳入 WeaknessScore，提高薄弱巩固推荐质量。

### 10.4 错题沉淀

专项训练中 `not_mastered` 的题目可以让学生一键加入错题库。

建议流程：

```text
专项训练未掌握
↓
提示是否加入错题库
↓
创建 mistakes
↓
后续进入今日复习周期
```

### 10.5 考前专题包

教师可以在 Web 后台创建专题包：

- 极限冲刺
- 导数定义专项
- 积分计算专项
- 线性代数基础专项

学生可直接选择专题包训练。

### 10.6 智能抽题

后续可按以下因素抽题：

- 学生错题分布
- 最近未掌握记录
- 题目难度
- 教师标记重点
- 考前高频题型

### 10.7 小程序专项训练

小程序端可以将专项训练放在“巩固”Tab 中：

- 每日薄弱巩固
- 专项训练
- 随机挑战

---

## 11. 与现有模块边界

### 与今日复习

今日复习基于学生自己的错题和复习周期，专项训练基于教师题库主动刷题。两者不共用 `review_tasks`。

### 与薄弱巩固

薄弱巩固是系统每日推荐，专项训练是学生主动选择。两者题目来源都可以是 `problems`，但任务表应分开。

### 与错题库

专项训练题目默认不进入错题库。只有学生标记未掌握且主动选择加入错题库时，才创建 `mistakes`。

### 与教师题库

专项训练只消费教师题库，不维护教师题库。题目录入、答案解析和题库质量仍由教师 Web 端负责。

---

# V1 实现修订（2026-06-10）

本次实现采用更收敛的 V1 范围：

1. 只允许选择到三级题型后开始训练。
   - 页面仍展示一级 / 二级 / 三级级联选择。
   - `POST /api/student/practice/sessions` 只接收 `questionTypeId`。
   - 未选择三级题型时返回 `VALIDATION_ERROR`。

2. 每次训练固定 5 题。
   - V1 不开放 10 / 15 题选择。
   - `practice_sessions.question_count` 固定写入 5。

3. 专项训练不复用 `review_tasks`。
   - 新增 `practice_sessions`。
   - 新增 `practice_records`。
   - 今日复习和专项训练保持业务语义分离。

4. V1 只记录专项训练数据。
   - 暂不把 `practice_records` 纳入 Dashboard。
   - 暂不影响 Top5 薄弱题型。
   - 暂不影响薄弱巩固 `WeaknessScore`。

5. 支持未掌握题目加入错题库。
   - 总结页展示本次 `not_mastered` 题目。
   - 学生点击“加入错题库”后，从 `problems` 创建 `mistakes`。
   - `input_type = latex`。
   - `latex_content` / `raw_latex` 使用 `problems.raw_latex`。
   - `stem` / `raw_text` 使用 LaTeX 清洗后的文本，清洗为空时回退原始 LaTeX。
   - `classification_status = student_selected`。
   - `classified_by = student`。
   - 插入 `mistakes` 后由数据库 trigger 自动生成复习任务。
   - 使用 `source = practice_problem:<problem_id>` 避免重复加入同一道教师题库题目。

## 当前已实现路由

```text
/practice
```

页面状态：
- 入口状态：三级题型级联选择，开始训练。
- 训练状态：显示第 X / 5 题、LaTeX 题目、题型、答案解析、已掌握 / 未掌握按钮。
- 完成状态：显示总题数、已掌握、未掌握、未掌握题目列表、加入错题库、再练一次、返回首页。

## 当前已实现 API

```text
GET /api/student/practice/options
POST /api/student/practice/sessions
GET /api/student/practice/sessions/[sessionId]
POST /api/student/practice/records/[recordId]/complete
POST /api/student/practice/sessions/[sessionId]/add-mistakes
```

统一返回格式：
```json
{ "ok": true, "data": {} }
```

失败返回：
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

权限：
- 仅 student 可访问。
- 未登录返回 `UNAUTHORIZED`。
- teacher/admin 返回 `FORBIDDEN`。
- 学生只能读取和更新自己的专项训练数据。

## 当前已实现数据表

```text
practice_sessions
practice_records
```

`practice_sessions`：记录一次训练。

核心字段：
- `user_id`
- `question_type_id`
- `question_count`
- `status`: `active` / `completed` / `abandoned`
- `started_at`
- `completed_at`

`practice_records`：记录训练中的每一道题。

核心字段：
- `session_id`
- `user_id`
- `problem_id`
- `question_type_id`
- `position`
- `status`: `pending` / `completed`
- `result`: `mastered` / `not_mastered` / `null`
- `answered_at`
- `added_to_mistakes_at`
- `created_mistake_id`

## 当前抽题策略

学生选择三级题型后：

1. 优先从该 `question_type_id` 抽题。
2. 不足 5 题时，从同二级分类下其他三级题型补足。
3. 再不足，从同一级分类下其他题型补足。
4. 再不足，从全题库随机补足。
5. 如果补足后仍不足 5 题，则返回题量不足错误。

所有候选题来自教师题库 `problems`，且必须有 `question_type_id`。

## 与现有模块边界

- 今日复习：仍由 `mistakes` 和 `review_tasks` 驱动。
- 薄弱巩固：仍由 `weak_practice_tasks` 驱动。
- 专项训练：由 `practice_sessions` 和 `practice_records` 驱动。
- 专项训练未掌握题只有在学生主动点击“加入错题库”时，才沉淀为 `mistakes` 并进入复习周期。
