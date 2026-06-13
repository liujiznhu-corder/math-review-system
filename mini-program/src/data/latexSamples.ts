export type LatexSampleCategory =
  | "delimiters"
  | "text"
  | "bold"
  | "displaystyle"
  | "sqrt"
  | "cases"
  | "aligned"
  | "choices"
  | "blank"
  | "solution"
  | "fallback";

export type LatexSample = {
  id: string;
  category: LatexSampleCategory;
  title: string;
  description: string;
  notes: string;
  acceptance: string;
  latex: string;
};

const note = (value: string) => value;

export const latexSampleCategories: LatexSampleCategory[] = [
  "delimiters",
  "text",
  "bold",
  "displaystyle",
  "sqrt",
  "cases",
  "aligned",
  "choices",
  "blank",
  "solution",
  "fallback"
];

export const latexSamples: LatexSample[] = [
  {
    id: "blank-line",
    category: "blank",
    title: "填空线",
    description: "验证自定义填空下划线。",
    notes: note("\\blankbox 应显示为数学试卷里的下划线，不是矩形框。"),
    acceptance: "检查 blankbox 是否显示为数学试卷里的下划线，而不是矩形输入框，且不会挤压相邻文字。",
    latex: String.raw`\blankbox`
  },
  {
    id: "limit-blankbox-inline-flow",
    category: "blank",
    title: "极限填空，同一行下划线",
    description: "验证纯公式、极限下标和填空线同一行。",
    notes: note("x→0 应在 lim 下方或标准极限下标位置。\\blankbox 应为下划线。下划线应在等号右侧，不应掉到下一行。"),
    acceptance: "检查 x→0 是否在 lim 下方或非常接近标准极限下标位置，分式显示正常，blankbox 显示为下划线，且下划线必须跟在等号右侧同一行。",
    latex: String.raw`\lim_{x \to 0} \frac{\sin x}{x} = \blankbox`
  },
  {
    id: "limit-blankbox-limits",
    category: "blank",
    title: "极限填空，limits 写法",
    description: "验证显式 limits 写法与填空线组合。",
    notes: note("验证 limits 写法下极限下标正常。下划线仍应和公式同一行。"),
    acceptance: "检查显式 \\limits 写法下 x→0 是否在 lim 下方，blankbox 显示为下划线，并且与等号保持同一公式行。",
    latex: String.raw`\lim\limits_{x \to 0} \frac{\sin x}{x} = \blankbox`
  },
  {
    id: "inline-chinese-multiple-formulas",
    category: "text",
    title: "行内中文 + 多个公式 + 填空",
    description: "验证中文题干中的多个行内公式与填空线。",
    notes: note("中文和行内公式自然混排。\\blankbox 在题干末尾显示为下划线。不要一段一段强制换行。"),
    acceptance: "检查中文和行内公式自然排在同一段中，f(x)、ln|3x-1|、积分公式不应各自单独占一行，blankbox 应显示为下划线。",
    latex: String.raw`已知 $f(x)$ 的一个原函数是 $\ln |3x-1|$，则 $\int f(3x),dx=$ \blankbox`
  },
  {
    id: "choice-stem",
    category: "choices",
    title: "选择题结构",
    description: "验证中文题干、填空线和四选项布局。",
    notes: note("题干自然换行。填空线不应掉到独立 block。四个选项独立成列表。选项不溢出、不遮挡。"),
    acceptance: "检查中文题干自然换行，填空线不独占异常位置，四个选项单独成行且不挤压。",
    latex: String.raw`已知 $f(x)$ 的一个原函数是 $\ln |3x-1|$，则 $\int f(3x),dx=$ \blankbox \fourchoices{$\frac{1}{3}\ln |9x-1|+C$}{$\frac{1}{3}\ln |3x-1|+C$}{$\ln |9x-1|+C$}{$3\ln |9x-1|+C$}`
  },
  {
    id: "choices-basic",
    category: "choices",
    title: "四选项基础结构",
    description: "验证四选项布局与选项内分式。",
    notes: note("A/B/C/D 应各自独立成列表项，选项内公式正常渲染。"),
    acceptance: "检查 A/B/C/D 是否各自独立成行，选项不溢出、不遮挡，1/2 与 π/2 是否是真正分式。",
    latex: String.raw`\fourchoices{$\frac{1}{2}$}{$\frac{\pi}{2}$}{$0$}{$1$}`
  },
  {
    id: "delimiter-round",
    category: "delimiters",
    title: "\\left...\\right 圆括号",
    description: "验证圆括号随分式高度伸缩。",
    notes: note("左右圆括号应随分式高度伸缩。不应 fallback。"),
    acceptance: "检查左右圆括号随分式高度伸缩，整体不 fallback。",
    latex: String.raw`\[\left( \frac{x+1}{x-1} \right)^2\]`
  },
  {
    id: "delimiter-square",
    category: "delimiters",
    title: "\\left...\\right 方括号",
    description: "验证方括号与分式。",
    notes: note("左右方括号正常显示。"),
    acceptance: "检查左右方括号正常显示，并包住内部两个分式项。",
    latex: String.raw`\[\left[ \frac{1}{x} + \frac{1}{x^2} \right]\]`
  },
  {
    id: "delimiter-brace",
    category: "delimiters",
    title: "\\left...\\right 花括号",
    description: "验证不规范花括号输入的 normalize。",
    notes: note("花括号输入为 \\left{ 和 \\right} 时，normalize 应转换为 \\left\\{ 和 \\right\\}。"),
    acceptance: "检查左右花括号正常显示；输入中的 \\left{ / \\right} 不应导致白屏。",
    latex: String.raw`\[\left{ x \mid x>0 \right}\]`
  },
  {
    id: "delimiter-abs",
    category: "delimiters",
    title: "绝对值",
    description: "验证绝对值竖线。",
    notes: note("绝对值竖线正常显示。"),
    acceptance: "检查左右绝对值竖线正常显示。",
    latex: String.raw`\[\left| 3x-1 \right|\]`
  },
  {
    id: "delimiter-mixed",
    category: "delimiters",
    title: "混合括号",
    description: "验证圆括号、方括号、上标和 ln。",
    notes: note("圆括号、方括号、上标、ln 正常。"),
    acceptance: "检查圆括号、方括号、上标、ln 均正常显示。",
    latex: String.raw`\[\left( \frac{\sin x}{x} \right)^{2} + \left[ \ln(1+x) \right]\]`
  },
  {
    id: "cases-text-chinese",
    category: "cases",
    title: "\\text{} 中文 + cases",
    description: "验证 cases 中中文 text。",
    notes: note("\\text{当 } 中中文正常显示。中文不要变公式斜体。cases 不重叠。"),
    acceptance: "检查 \\text{当 } 中中文正常显示，cases 三行不重叠。",
    latex: String.raw`\[f(x)=\begin{cases}x^2, & \text{当 } x>0 \\ 0, & \text{当 } x=0\end{cases}\]`
  },
  {
    id: "cases-piecewise",
    category: "cases",
    title: "分段函数 cases",
    description: "验证常见分段函数。",
    notes: note("cases 左大括号显示正常，三行分段条件显示正常，每行表达式和条件不要重叠。"),
    acceptance: "检查 cases 左大括号显示正常，三行分段条件显示正常，每行表达式和条件不要重叠。",
    latex: String.raw`\[f(x)=\begin{cases}\frac{\sin ax}{x}, &x>0 \\ 2, &x=0 \\ \frac{1}{bx}\ln (1-3x), &x<0\end{cases}\]`
  },
  {
    id: "boldsymbol-vector",
    category: "bold",
    title: "\\boldsymbol{}",
    description: "验证 boldsymbol normalize。",
    notes: note("如果支持，显示粗体数学符号。如果当前库不支持，可 normalize 为 \\mathbf{} 或明确 fallback。不能报错白屏。"),
    acceptance: "检查 boldsymbol 是否被转换为可渲染的粗体数学符号，不能白屏。",
    latex: String.raw`\[\boldsymbol{x} = (x_1,x_2,\cdots,x_n)\]`
  },
  {
    id: "boldsymbol-matrix-vector",
    category: "bold",
    title: "\\boldsymbol{} 矩阵向量",
    description: "验证多个 boldsymbol。",
    notes: note("同上，支持或明确 fallback。"),
    acceptance: "检查 A、x、b 是否显示为粗体数学符号，或明确 fallback。",
    latex: String.raw`\[\boldsymbol{A}\boldsymbol{x}=\boldsymbol{b}\]`
  },
  {
    id: "displaystyle-inline",
    category: "displaystyle",
    title: "\\displaystyle 行内",
    description: "验证中文行内 displaystyle。",
    notes: note("行内 \\displaystyle 不应导致解析失败。分式可稍大，但不应把整段中文拆成多行。"),
    acceptance: "检查中文仍自然混排，行内 displaystyle 不导致整段拆成多行。",
    latex: String.raw`这是行内公式 $\displaystyle \frac{1}{1+x}$ 的显示效果。`
  },
  {
    id: "displaystyle-block",
    category: "displaystyle",
    title: "\\displaystyle 块级",
    description: "验证块级 displaystyle 与求和。",
    notes: note("块级公式正常显示。"),
    acceptance: "检查块级求和公式上下限和分式正常显示。",
    latex: String.raw`\[\displaystyle \sum_{n=1}^{\infty}\frac{1}{n^2}\]`
  },
  {
    id: "sqrt-index",
    category: "sqrt",
    title: "\\sqrt[]{} 带次数根号",
    description: "验证三次根号。",
    notes: note("三次根号正常显示，或明确 fallback。不允许页面报错。"),
    acceptance: "检查三次根号正常显示；若库不支持，应 fallback 且页面不白屏。",
    latex: String.raw`\[\sqrt[3]{x^{2}+1}\]`
  },
  {
    id: "sqrt-basic",
    category: "sqrt",
    title: "基础根号与分式",
    description: "验证根号作为分母。",
    notes: note("根号覆盖 x+1，分式上下结构正常。"),
    acceptance: "检查分子 x²+1 在上方，分母 sqrt(x+1) 在下方，根号覆盖 x+1。",
    latex: String.raw`\[\frac{x^{2}+1}{\sqrt{x+1}}\]`
  },
  {
    id: "aligned-derivation",
    category: "aligned",
    title: "aligned 多行推导",
    description: "验证 aligned 多行公式。",
    notes: note("多行对齐正常。等号对齐尽量正常。不应白屏。"),
    acceptance: "检查多行对齐正常，等号尽量对齐，页面不白屏。",
    latex: String.raw`\[\begin{aligned}I &= \int_{0}^{1} x e^{x},dx \\ &= \left. x e^{x} \right|_{0}^{1} - \int_{0}^{1} e^{x},dx \\ &= 1\end{aligned}\]`
  },
  {
    id: "align-star",
    category: "aligned",
    title: "align* 多行公式",
    description: "验证 align* normalize。",
    notes: note("如果 KaTeX 小程序方案不支持 align*，normalize 为 aligned。不能白屏。"),
    acceptance: "检查 align* 是否被转换为 aligned 并正常显示，或明确 fallback。",
    latex: String.raw`\[\begin{align*}a^2-b^2 &= (a-b)(a+b) \\ (x+1)^2 &= x^2+2x+1\end{align*}\]`
  },
  {
    id: "solution-text-display-blank",
    category: "solution",
    title: "解析文字 + 块级公式 + 填空",
    description: "验证文字、块级公式和填空线组合。",
    notes: note("文字、块级公式、填空线分段合理。填空线不要独占异常位置。"),
    acceptance: "检查文字、块级公式、填空线分段合理；填空线不出现异常独占位置。",
    latex: String.raw`由导数定义可得：\[\displaystyle f'(x_0)=\lim_{\Delta x\to0}\frac{f(x_0+\Delta x)-f(x_0)}{\Delta x}\]所以答案为 \blankbox。`
  },
  {
    id: "inline-chinese-limit",
    category: "text",
    title: "中文行内极限",
    description: "验证中文题干中的极限公式仍为行内公式。",
    notes: note("中文行内公式不要被强制拆成多行。"),
    acceptance: "检查中文行内公式不要被强制拆成多行，lim 公式应和中文自然排在同一段中。",
    latex: String.raw`求极限 $\lim_{x \to 0} \frac{\sin x}{x}$ 的值。`
  },
  {
    id: "text-display-limit",
    category: "text",
    title: "中文 + display math",
    description: "验证中文文本后的 display delimiter。",
    notes: note("display math 应被切分，传给 KaTeX 时不包含外层 \\[ 和 \\]。"),
    acceptance: "检查“计算极限”和块级极限公式分段正常，不出现 Undefined control sequence: \\[。",
    latex: String.raw`计算极限
\[
\lim\limits_{x \to 0} \frac{\sin x}{x}
\]`
  },
  {
    id: "text-display-blank-regression",
    category: "solution",
    title: "中文 + display math + 后续中文",
    description: "验证 display math 后继续渲染文本和填空线。",
    notes: note("应切分为 text + displayMath + text + blankbox。"),
    acceptance: "检查导数定义公式不带 delimiter 传入 KaTeX，后续 blankbox 不掉行。",
    latex: String.raw`由导数定义可得：
\[
f'(x_0)=\lim_{\Delta x\to0}\frac{f(x_0+\Delta x)-f(x_0)}{\Delta x}
\]
所以答案为 \blankbox。`
  },
  {
    id: "text-display-vector",
    category: "bold",
    title: "中文 + 矩阵/向量公式",
    description: "验证中文、行内向量和 display 二次型。",
    notes: note("行内 \\mathbf 和块级 display math 都应正常。"),
    acceptance: "检查 display math 不带外层 delimiter 进入 KaTeX。",
    latex: String.raw`令 $\mathbf{x}=(x_1,x_2)^T$，则
\[
f=\mathbf{x}^{T}A\mathbf{x}
\]`
  },
  {
    id: "pure-integral-no-delimiter",
    category: "displaystyle",
    title: "普通纯公式，不带 delimiter",
    description: "验证纯公式可直接作为 display/pure math。",
    notes: note("整段没有中文，可作为 pure math 渲染，不额外添加 delimiter。"),
    acceptance: "检查纯积分公式正常显示。",
    latex: String.raw`\int_0^1 x\sqrt{1+x^2},dx`
  },
  {
    id: "display-integral-delimiter",
    category: "displaystyle",
    title: "块级公式带 delimiter",
    description: "验证带 \\[...\\] 的积分公式。",
    notes: note("外层 \\[ 和 \\] 必须剥离后再传入 KaTeX。"),
    acceptance: "检查不出现 Undefined control sequence: \\[。",
    latex: String.raw`\[
\int_0^1 x\sqrt{1+x^2},dx
\]`
  },
  {
    id: "trig-power",
    category: "displaystyle",
    title: "三角函数幂次",
    description: "验证三角函数指数。",
    notes: note("sin²x、cos²x 的 2 是上标，并且公式整体不被拆散。"),
    acceptance: "检查 sin²x、cos²x 的 2 是否是上标，并且公式整体不被拆散。",
    latex: String.raw`\[\sin^{2}x+\cos^{2}x=1\]`
  },
  {
    id: "intentional-fallback",
    category: "fallback",
    title: "失败降级样例",
    description: "故意放入不完整 frac，验证单个样例失败不影响整页。",
    notes: note("应显示 fallback 或 error，不能白屏，不能影响其他样例。"),
    acceptance: "检查单个样例失败不影响整页，降级信息清晰。",
    latex: String.raw`\[\frac{1}{\]`
  }
];
