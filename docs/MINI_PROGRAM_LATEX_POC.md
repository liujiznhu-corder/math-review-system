# 微信小程序 LaTeX 渲染 POC 说明

本文档记录“江苏专转本数学错题复盘系统”微信小程序端 LaTeX 渲染 POC。

本次 POC 只新增 `mini-program` 目录下的最小 Taro 验证页和本文档，不接数据库、不接后端 API、不修改现有 Web 学生端页面、教师端页面、Supabase schema、已有 API 或 `services/student` 业务逻辑。

---

# 1. 当前采用的渲染方案

POC 同时比较两种方案：

## 方案 A：小程序端直接渲染 LaTeX

`mini-program/src/components/LatexRenderer/index.tsx` 中实现一个轻量 LaTeX 解析器，将固定样例中的 LaTeX 字符串解析成内部 token，然后用 Taro 组件直接渲染：

- `View`
- `Text`
- `ScrollView`

该方案用于验证小程序端能否在不依赖后端转换的情况下展示常见数学题结构。

## 方案 B：转换为 RichText nodes 后渲染

同一个解析结果会转换为 RichText nodes，通过 Taro `RichText` 展示。

该方案用于验证后续如果需要把 LaTeX 转为 HTML / 富文本节点，小程序端是否具备稳定展示路径。

---

# 2. 为什么选择该方案

本次 POC 不引入第三方库，原因是：

- 先验证最小可行链路，避免 POC 阶段污染 Web 端依赖。
- 当前需求只要求验证固定数学题样例和关键自定义命令，不需要一次性支持完整 LaTeX。
- Taro + React + TypeScript 可以让组件拆分方式贴近现有 Web 项目，先用轻量解析器验证交互和降级策略。
- 方案 A 和方案 B 使用同一份解析结果，便于比较“组件直接渲染”和“RichText 渲染”的表现差异。

POC 结论倾向：

- V1 正式页面可以优先采用“后端返回原始字段不变，小程序端 `LatexRenderer` 做受控解析和降级”的方案。
- 如果后续需要更高保真度，再单独验证第三方 LaTeX 渲染库或服务端预转换 HTML/RichText nodes。

---

# 3. 支持的 LaTeX 语法

当前 POC 已覆盖并展示：

- 普通行内公式，例如 `$f(x)$`
- `\frac{}{}`，支持嵌套 `\frac`
- `\sqrt{}`
- `\int`
- `\sum`
- `\lim`
- `\sin`
- `\cos`
- `\infty`
- `\pi`
- `\to`
- `\ln`
- `\blankbox`
- `\fourchoices`
- 填空题下划线：`\_\_\_` 和 `___`
- 长公式横向滚动
- 渲染失败时显示原始 LaTeX 文本

测试样例位于：

```text
mini-program/src/utils/latexSamples.ts
```

POC 页面位于：

```text
mini-program/src/pages/latex-poc/index.tsx
```

---

# 4. 暂不支持的语法

当前 POC 不是完整 LaTeX 引擎，暂不支持：

- 矩阵、分段函数、方程组等复杂结构。
- `\begin{...}` / `\end{...}` 环境。
- KaTeX/MathJax 级别的精确排版。
- 自动识别全部 LaTeX 命令。
- 复杂上下标排版，目前 `_`、`^` 仍作为普通文本展示。
- 自适应字号、自动换行公式、多行推导排版。
- 富文本中所有 CSS 在微信基础库里的最终兼容性保证。

如果正式小程序需要支持这些语法，应在 POC 之后单独评估第三方库或服务端转换方案。

---

# 5. `\blankbox` 和 `\fourchoices` 的处理方式

## `\blankbox`

处理方式：

- 解析为 `blankbox` token。
- 方案 A 中渲染为带边框的行内空框。
- 方案 B 中渲染为 RichText `span`，使用内联样式模拟空框。

用途：

- 对应选择题题干中的待填答案位置。

## `\fourchoices`

处理方式：

- 解析 `\fourchoices` 后连续读取 4 个花括号参数。
- 每个选项继续递归解析其中的 LaTeX。
- 方案 A 中渲染为 A/B/C/D 四行选项。
- 方案 B 中转换为 RichText nodes 的四行选项。

当前约束：

- POC 默认 `\fourchoices` 必须有 4 个选项。
- 如果选项花括号缺失，会进入失败降级。

---

# 6. 长公式横向滚动方案

POC 中原始 LaTeX、方案 A 渲染结果、方案 B RichText 渲染结果都包裹在横向 `ScrollView` 中：

```tsx
<ScrollView scrollX className="latex-render-scroll">
  ...
</ScrollView>
```

样式策略：

- 渲染容器使用 `min-width: max-content`。
- 公式内容使用 `white-space: nowrap`。
- 长公式不强行换行，不撑破页面。
- 用户可横向滑动查看完整公式。

正式页面接入时，所有题干、答案、解析中的公式区域都应沿用这个模式。

---

# 7. 渲染失败降级方案

解析失败时，组件返回失败状态：

- 页面展示“渲染失败”状态。
- 展示具体失败原因。
- 在降级区域横向滚动展示原始 LaTeX 文本。
- 不阻塞页面其它题目渲染。

当前 POC 使用一个故意不完整的样例验证失败降级：

```text
\frac{1}{
```

失败原因会显示为参数花括号不完整，降级内容仍显示原始 LaTeX。

---

# 8. 后续如何接入正式小程序页面

后续正式接入建议：

1. 保留 `LatexRenderer` 作为小程序端统一公式展示组件。
2. 今日复习、薄弱巩固、专项训练、错题本、错题详情、答案解析都只通过该组件展示题目内容。
3. 组件输入优先使用 API 返回的 `displayLatex`。
4. 如果没有 `displayLatex`，降级使用 `raw_latex`、`latex_content` 或 `stem`。
5. 每个调用方只关心展示文本，不自行处理 `\blankbox`、`\fourchoices` 和横向滚动。
6. POC 验证通过后，再决定是否引入第三方 LaTeX 渲染库。

---

# 9. 是否需要修改后端返回字段

本次 POC 不需要修改后端返回字段。

当前后端已有字段可以支撑 V1：

- `displayLatex`
- `raw_latex`
- `latex_content`
- `raw_text`
- `stem`

建议正式接入规则：

1. 优先使用 `displayLatex`。
2. 没有 `displayLatex` 时使用 `raw_latex`。
3. 再降级到 `latex_content`、`raw_text`、`stem`。
4. 渲染失败时显示当前输入的原始文本。

如果未来采用服务端预转换 RichText nodes，可以新增独立字段或接口，但 V1 暂不需要。

---

# 10. POC 文件清单

```text
mini-program/src/app.tsx
mini-program/src/app.config.ts
mini-program/src/pages/latex-poc/index.tsx
mini-program/src/pages/latex-poc/index.config.ts
mini-program/src/pages/latex-poc/index.scss
mini-program/src/components/LatexRenderer/index.tsx
mini-program/src/components/LatexRenderer/index.scss
mini-program/src/utils/latexSamples.ts
mini-program/src/types/taro-shim.d.ts
docs/MINI_PROGRAM_LATEX_POC.md
```

`mini-program/src/types/taro-shim.d.ts` 是 POC 阶段的最小类型 shim，用于在当前仓库尚未安装 Taro 依赖时让 TypeScript 能检查 POC 文件结构。正式初始化 Taro 工程并安装依赖后，应改用 Taro 官方类型。
