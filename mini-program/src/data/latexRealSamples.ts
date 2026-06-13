export type LatexRealSampleType =
  | "single_choice"
  | "fill_blank"
  | "subjective"
  | "solution";

export type LatexRealSampleDifficulty = "基础" | "中等" | "较难";

export type LatexRealSample = {
  id: string;
  type: LatexRealSampleType;
  title: string;
  stem: string;
  options: string[];
  answer: string;
  analysis: string;
  questionType: string;
  difficulty: LatexRealSampleDifficulty;
  tags: string[];
  notes: string;
};

export const latexRealSamples: LatexRealSample[] = [
  {
    id: "real-limit-001",
    type: "fill_blank",
    title: "重要极限填空",
    stem: String.raw`\lim_{x \to 0} \frac{\sin x}{x} = \blankbox`,
    options: [],
    answer: String.raw`1`,
    analysis: String.raw`由第一重要极限 \[\lim_{x\to0}\frac{\sin x}{x}=1\] 可得答案为 $1$。`,
    questionType: "极限",
    difficulty: "基础",
    tags: ["极限", "重要极限", "blankbox"],
    notes: "验收极限下标和 blankbox 同行。"
  },
  {
    id: "real-limit-002",
    type: "single_choice",
    title: "等价无穷小选择",
    stem: String.raw`当 $x\to0$ 时，$\sqrt{1+x}-1$ 等价于 \blankbox`,
    options: [String.raw`x`, String.raw`\frac{x}{2}`, String.raw`2x`, String.raw`x^2`],
    answer: "B",
    analysis: String.raw`\[\sqrt{1+x}-1=\frac{x}{\sqrt{1+x}+1}\sim \frac{x}{2}\] 因此选 B。`,
    questionType: "极限",
    difficulty: "基础",
    tags: ["极限", "等价无穷小", "sqrt"],
    notes: "验收行内中文 + 根号 + 四选项。"
  },
  {
    id: "real-limit-003",
    type: "subjective",
    title: "高阶无穷小极限",
    stem: String.raw`计算极限 \[\lim_{x \to 0} \frac{\sin x - x + \frac{x^3}{6}}{x^5}\]`,
    options: [],
    answer: String.raw`\frac{1}{120}`,
    analysis: String.raw`利用展开式：\[\sin x=x-\frac{x^3}{6}+\frac{x^5}{120}+o(x^5)\] 所以原式等于 $\frac{1}{120}$。`,
    questionType: "极限",
    difficulty: "较难",
    tags: ["极限", "泰勒展开", "frac"],
    notes: "验收嵌套分式和 display math。"
  },
  {
    id: "real-limit-004",
    type: "fill_blank",
    title: "指数型极限",
    stem: String.raw`\lim_{x\to0}\frac{e^x-1-x}{x^2}=\blankbox`,
    options: [],
    answer: String.raw`\frac{1}{2}`,
    analysis: String.raw`由 $e^x=1+x+\frac{x^2}{2}+o(x^2)$ 得 \[\lim_{x\to0}\frac{e^x-1-x}{x^2}=\frac{1}{2}\]。`,
    questionType: "极限",
    difficulty: "中等",
    tags: ["极限", "泰勒展开"],
    notes: "验收 blankbox 和 display lim。"
  },
  {
    id: "real-limit-005",
    type: "single_choice",
    title: "无穷远极限",
    stem: String.raw`\lim_{x\to\infty}\left(1+\frac{2}{x}\right)^x= \blankbox`,
    options: [String.raw`e`, String.raw`e^2`, String.raw`2e`, String.raw`1`],
    answer: "B",
    analysis: String.raw`标准极限 \[\lim_{x\to\infty}\left(1+\frac{a}{x}\right)^x=e^a\]，取 $a=2$。`,
    questionType: "极限",
    difficulty: "基础",
    tags: ["极限", "left-right", "infty"],
    notes: "验收 \\left...\\right 和无穷。"
  },
  {
    id: "real-limit-006",
    type: "subjective",
    title: "分段函数连续性",
    stem: String.raw`设 \[f(x)=\begin{cases}\frac{\sin ax}{x}, &x>0 \\ 2, &x=0 \\ \frac{1}{bx}\ln(1-3x), &x<0\end{cases}\] 若 $f(x)$ 在 $x=0$ 连续，求 $a,b$。`,
    options: [],
    answer: String.raw`a=2,\ b=-\frac{3}{2}`,
    analysis: String.raw`右极限为 $a$，左极限为 $-\frac{3}{b}$。连续要求 \[\begin{aligned}a&=2\\-\frac{3}{b}&=2\end{aligned}\] 故 $a=2,b=-\frac{3}{2}$。`,
    questionType: "分段函数",
    difficulty: "较难",
    tags: ["cases", "aligned", "text"],
    notes: "验收 cases、aligned、中文题干。"
  },
  {
    id: "real-derivative-001",
    type: "single_choice",
    title: "导数定义",
    stem: String.raw`函数 $f(x)$ 在 $x_0$ 处的导数可表示为 \blankbox`,
    options: [
      String.raw`\lim_{\Delta x\to0}\frac{f(x_0+\Delta x)-f(x_0)}{\Delta x}`,
      String.raw`\lim_{\Delta x\to0}\frac{f(x_0)-f(x_0+\Delta x)}{\Delta x}`,
      String.raw`\lim_{x\to0}\frac{f(x)}{x}`,
      String.raw`\lim_{x\to x_0}f(x)`
    ],
    answer: "A",
    analysis: String.raw`导数定义为 \[f'(x_0)=\lim_{\Delta x\to0}\frac{f(x_0+\Delta x)-f(x_0)}{\Delta x}\]。`,
    questionType: "导数",
    difficulty: "基础",
    tags: ["导数", "定义", "Delta"],
    notes: "验收长选项公式和 Delta。"
  },
  {
    id: "real-derivative-002",
    type: "fill_blank",
    title: "幂函数求导",
    stem: String.raw`若 $y=x^5$，则 $y'=\blankbox$`,
    options: [],
    answer: String.raw`5x^4`,
    analysis: String.raw`由幂函数求导公式 $(x^n)'=nx^{n-1}$，得 $y'=5x^4$。`,
    questionType: "导数",
    difficulty: "基础",
    tags: ["导数", "幂函数"],
    notes: "验收行内上标和 blankbox。"
  },
  {
    id: "real-derivative-003",
    type: "subjective",
    title: "复合函数求导",
    stem: String.raw`求函数 $y=\ln(1+x^2)$ 的导数。`,
    options: [],
    answer: String.raw`\frac{2x}{1+x^2}`,
    analysis: String.raw`\[y'=\frac{1}{1+x^2}\cdot 2x=\frac{2x}{1+x^2}\]`,
    questionType: "导数",
    difficulty: "基础",
    tags: ["导数", "复合函数", "ln"],
    notes: "验收 ln 和分式。"
  },
  {
    id: "real-derivative-004",
    type: "subjective",
    title: "隐函数求导",
    stem: String.raw`由方程 $x^2+y^2=1$ 确定 $y=y(x)$，求 $\frac{dy}{dx}$。`,
    options: [],
    answer: String.raw`-\frac{x}{y}`,
    analysis: String.raw`两边对 $x$ 求导：\[\begin{aligned}2x+2y\frac{dy}{dx}&=0\\ \frac{dy}{dx}&=-\frac{x}{y}\end{aligned}\]`,
    questionType: "导数",
    difficulty: "中等",
    tags: ["导数", "隐函数", "aligned"],
    notes: "验收 aligned 解析。"
  },
  {
    id: "real-derivative-005",
    type: "fill_blank",
    title: "参数方程求导",
    stem: String.raw`若 $x=t^2,\ y=t^3$，则 $\frac{dy}{dx}=\blankbox$`,
    options: [],
    answer: String.raw`\frac{3t}{2}`,
    analysis: String.raw`\[\frac{dy}{dx}=\frac{\frac{dy}{dt}}{\frac{dx}{dt}}=\frac{3t^2}{2t}=\frac{3t}{2}\]`,
    questionType: "导数",
    difficulty: "中等",
    tags: ["导数", "参数方程"],
    notes: "验收 displaystyle 分式链。"
  },
  {
    id: "real-derivative-006",
    type: "single_choice",
    title: "切线斜率",
    stem: String.raw`曲线 $y=x^2+1$ 在 $x=1$ 处切线斜率为 \blankbox`,
    options: [String.raw`1`, String.raw`2`, String.raw`3`, String.raw`4`],
    answer: "B",
    analysis: String.raw`$y'=2x$，当 $x=1$ 时，斜率 $k=2$。`,
    questionType: "导数",
    difficulty: "基础",
    tags: ["导数", "切线", "choices"],
    notes: "验收简单选择题。"
  },
  {
    id: "real-int-001",
    type: "subjective",
    title: "基本不定积分",
    stem: String.raw`计算不定积分 \[\int \frac{2x}{1+x^2}\,dx\]`,
    options: [],
    answer: String.raw`\ln(1+x^2)+C`,
    analysis: String.raw`令 $u=1+x^2$，则 $du=2x\,dx$，所以 \[\int \frac{2x}{1+x^2}\,dx=\ln(1+x^2)+C\]。`,
    questionType: "不定积分",
    difficulty: "基础",
    tags: ["不定积分", "换元法", "ln"],
    notes: "验收积分和微分空格。"
  },
  {
    id: "real-int-002",
    type: "fill_blank",
    title: "反三角积分",
    stem: String.raw`\int \frac{1}{\sqrt{1-x^2}}\,dx=\blankbox`,
    options: [],
    answer: String.raw`\arcsin x+C`,
    analysis: String.raw`基本公式：\[\int\frac{1}{\sqrt{1-x^2}}\,dx=\arcsin x+C\]。`,
    questionType: "不定积分",
    difficulty: "基础",
    tags: ["不定积分", "sqrt", "blankbox"],
    notes: "验收根号和 blankbox 同行。"
  },
  {
    id: "real-int-003",
    type: "subjective",
    title: "分部积分",
    stem: String.raw`计算 \[\int x e^x\,dx\]`,
    options: [],
    answer: String.raw`xe^x-e^x+C`,
    analysis: String.raw`取 $u=x,\ dv=e^x dx$，则 \[\begin{aligned}\int xe^x dx&=xe^x-\int e^x dx\\&=xe^x-e^x+C\end{aligned}\]`,
    questionType: "不定积分",
    difficulty: "中等",
    tags: ["不定积分", "分部积分", "aligned"],
    notes: "验收 aligned 多行推导。"
  },
  {
    id: "real-int-004",
    type: "single_choice",
    title: "不定积分选择",
    stem: String.raw`\int \cos x\,dx = \blankbox`,
    options: [String.raw`\sin x+C`, String.raw`-\sin x+C`, String.raw`\cos x+C`, String.raw`-\cos x+C`],
    answer: "A",
    analysis: String.raw`因为 $(\sin x)'=\cos x$，所以原积分为 $\sin x+C$。`,
    questionType: "不定积分",
    difficulty: "基础",
    tags: ["不定积分", "三角函数", "fourchoices"],
    notes: "验收三角函数选项。"
  },
  {
    id: "real-int-005",
    type: "subjective",
    title: "有理函数积分",
    stem: String.raw`计算 \[\int \frac{x+1}{x^2+2x+2}\,dx\]`,
    options: [],
    answer: String.raw`\frac{1}{2}\ln(x^2+2x+2)+C`,
    analysis: String.raw`注意 $(x^2+2x+2)'=2x+2=2(x+1)$，故 \[\int \frac{x+1}{x^2+2x+2}\,dx=\frac{1}{2}\ln(x^2+2x+2)+C\]。`,
    questionType: "不定积分",
    difficulty: "中等",
    tags: ["不定积分", "frac", "ln"],
    notes: "验收长分式和 ln。"
  },
  {
    id: "real-int-006",
    type: "fill_blank",
    title: "带次数根号",
    stem: String.raw`\sqrt[3]{x^2+1}` + String.raw` 在小程序中应显示为三次根号，结果检查：\blankbox`,
    options: [],
    answer: String.raw`显示正常`,
    analysis: String.raw`该题用于渲染验收：\[\sqrt[3]{x^2+1}\] 若库不支持，应 fallback 而不白屏。`,
    questionType: "不定积分",
    difficulty: "基础",
    tags: ["sqrt", "三次根号"],
    notes: "验收 sqrt[]{}。"
  },
  {
    id: "real-defint-001",
    type: "subjective",
    title: "三角函数定积分",
    stem: String.raw`计算定积分 \[\int_{0}^{\frac{\pi}{2}}\sin^4 x\cos^2 x\,dx\]`,
    options: [],
    answer: String.raw`\frac{\pi}{32}`,
    analysis: String.raw`可用降幂公式化简，重点验收 \[\int_{0}^{\frac{\pi}{2}}\sin^4 x\cos^2 x\,dx\] 的上下限和幂次显示。`,
    questionType: "定积分",
    difficulty: "较难",
    tags: ["定积分", "三角函数", "pi"],
    notes: "验收定积分上限分式。"
  },
  {
    id: "real-defint-002",
    type: "fill_blank",
    title: "奇偶性定积分",
    stem: String.raw`\int_{-1}^{1} x^3\,dx=\blankbox`,
    options: [],
    answer: String.raw`0`,
    analysis: String.raw`$x^3$ 为奇函数，关于 $[-1,1]$ 对称积分为 $0$。`,
    questionType: "定积分",
    difficulty: "基础",
    tags: ["定积分", "奇偶性"],
    notes: "验收上下限和 blankbox。"
  },
  {
    id: "real-defint-003",
    type: "subjective",
    title: "变上限积分求导",
    stem: String.raw`设 $F(x)=\int_{0}^{x^2}\sin t\,dt$，求 $F'(x)$。`,
    options: [],
    answer: String.raw`2x\sin x^2`,
    analysis: String.raw`由变上限积分求导：\[\frac{d}{dx}\int_0^{u(x)}f(t)\,dt=f(u(x))u'(x)\] 得 $F'(x)=2x\sin x^2$。`,
    questionType: "定积分",
    difficulty: "中等",
    tags: ["定积分", "变上限积分"],
    notes: "验收文字 + display 公式。"
  },
  {
    id: "real-defint-004",
    type: "single_choice",
    title: "牛顿莱布尼茨公式",
    stem: String.raw`\int_0^1 2x\,dx= \blankbox`,
    options: [String.raw`0`, String.raw`1`, String.raw`2`, String.raw`\frac{1}{2}`],
    answer: "B",
    analysis: String.raw`\[\int_0^1 2x\,dx=\left.x^2\right|_0^1=1\]`,
    questionType: "定积分",
    difficulty: "基础",
    tags: ["定积分", "choices"],
    notes: "验收 \\\\left. 与上下限。"
  },
  {
    id: "real-defint-005",
    type: "subjective",
    title: "换元定积分",
    stem: String.raw`计算 \[\int_0^1 x\sqrt{1+x^2}\,dx\]`,
    options: [],
    answer: String.raw`\frac{1}{3}(2\sqrt2-1)`,
    analysis: String.raw`令 $u=1+x^2$，则 \[\int_0^1 x\sqrt{1+x^2}\,dx=\frac{1}{2}\int_1^2 u^{\frac12}\,du=\frac{1}{3}(2\sqrt2-1)\]。`,
    questionType: "定积分",
    difficulty: "中等",
    tags: ["定积分", "换元", "sqrt"],
    notes: "验收嵌套分式和根号。"
  },
  {
    id: "real-multi-001",
    type: "fill_blank",
    title: "偏导数",
    stem: String.raw`设 $z=x^2y+\sin y$，则 $\frac{\partial z}{\partial x}=\blankbox`,
    options: [],
    answer: String.raw`2xy`,
    analysis: String.raw`对 $x$ 求偏导时 $y$ 视为常数，所以 \[\frac{\partial z}{\partial x}=2xy\]。`,
    questionType: "多元函数",
    difficulty: "基础",
    tags: ["多元函数", "偏导数"],
    notes: "验收 partial 分式。"
  },
  {
    id: "real-multi-002",
    type: "subjective",
    title: "全微分",
    stem: String.raw`求 $z=x^2+y^2$ 的全微分 $dz$。`,
    options: [],
    answer: String.raw`dz=2x\,dx+2y\,dy`,
    analysis: String.raw`由全微分公式 \[dz=\frac{\partial z}{\partial x}dx+\frac{\partial z}{\partial y}dy\] 得 $dz=2x\,dx+2y\,dy$。`,
    questionType: "多元函数",
    difficulty: "基础",
    tags: ["多元函数", "全微分"],
    notes: "验收 partial 与 dx/dy。"
  },
  {
    id: "real-multi-003",
    type: "single_choice",
    title: "二阶偏导",
    stem: String.raw`若 $z=x^2y^3$，则 $\frac{\partial^2 z}{\partial x\partial y}=$ \blankbox`,
    options: [String.raw`6xy^2`, String.raw`2xy^3`, String.raw`3x^2y^2`, String.raw`0`],
    answer: "A",
    analysis: String.raw`先对 $y$ 求偏导得 $3x^2y^2$，再对 $x$ 求偏导得 $6xy^2$。`,
    questionType: "多元函数",
    difficulty: "中等",
    tags: ["多元函数", "二阶偏导", "choices"],
    notes: "验收偏导上标和选择题。"
  },
  {
    id: "real-multi-004",
    type: "subjective",
    title: "二重积分区域",
    stem: String.raw`计算 \[\iint_D (x+y)\,d\sigma,\quad D=\left\{(x,y)\mid 0\le x\le1,0\le y\le1\right\}\]`,
    options: [],
    answer: String.raw`1`,
    analysis: String.raw`\[\begin{aligned}\iint_D(x+y)d\sigma&=\int_0^1\int_0^1(x+y)\,dy\,dx\\&=1\end{aligned}\]`,
    questionType: "多元函数",
    difficulty: "中等",
    tags: ["多元函数", "二重积分", "left-right"],
    notes: "验收花括号、aligned 和二重积分。"
  },
  {
    id: "real-multi-005",
    type: "fill_blank",
    title: "方向导数预览",
    stem: String.raw`向量 $\boldsymbol{a}=(1,2)$ 的长度 $|\boldsymbol{a}|=\blankbox`,
    options: [],
    answer: String.raw`\sqrt5`,
    analysis: String.raw`\[|\boldsymbol{a}|=\sqrt{1^2+2^2}=\sqrt5\] 其中 \boldsymbol 会被 normalize 为可显示的粗体形式。`,
    questionType: "多元函数",
    difficulty: "基础",
    tags: ["多元函数", "boldsymbol", "sqrt"],
    notes: "验收 boldsymbol normalize。"
  },
  {
    id: "real-ode-001",
    type: "subjective",
    title: "一阶可分离变量方程",
    stem: String.raw`求微分方程 $\frac{dy}{dx}=xy$ 的通解。`,
    options: [],
    answer: String.raw`y=Ce^{\frac{x^2}{2}}`,
    analysis: String.raw`\[\frac{dy}{y}=x\,dx\] 两边积分得 \[\ln|y|=\frac{x^2}{2}+C\] 故 $y=Ce^{\frac{x^2}{2}}$。`,
    questionType: "微分方程",
    difficulty: "中等",
    tags: ["微分方程", "可分离变量"],
    notes: "验收绝对值和分式指数。"
  },
  {
    id: "real-ode-002",
    type: "fill_blank",
    title: "齐次线性方程",
    stem: String.raw`微分方程 $y'+y=0$ 的通解为 \blankbox`,
    options: [],
    answer: String.raw`y=Ce^{-x}`,
    analysis: String.raw`特征方程 $r+1=0$，故 $r=-1$，通解 $y=Ce^{-x}$。`,
    questionType: "微分方程",
    difficulty: "基础",
    tags: ["微分方程", "一阶线性"],
    notes: "验收上标负号。"
  },
  {
    id: "real-ode-003",
    type: "subjective",
    title: "二阶常系数方程",
    stem: String.raw`求 $y''-3y'+2y=0$ 的通解。`,
    options: [],
    answer: String.raw`y=C_1e^x+C_2e^{2x}`,
    analysis: String.raw`特征方程 \[r^2-3r+2=0\] 得 $r_1=1,r_2=2$，故 $y=C_1e^x+C_2e^{2x}$。`,
    questionType: "微分方程",
    difficulty: "中等",
    tags: ["微分方程", "二阶"],
    notes: "验收下标和指数。"
  },
  {
    id: "real-ode-004",
    type: "single_choice",
    title: "微分方程阶数",
    stem: String.raw`方程 $y''+y=\sin x$ 是 \blankbox 微分方程。`,
    options: [String.raw`一阶`, String.raw`二阶`, String.raw`三阶`, String.raw`零阶`],
    answer: "B",
    analysis: String.raw`最高阶导数为 $y''$，所以是二阶微分方程。`,
    questionType: "微分方程",
    difficulty: "基础",
    tags: ["微分方程", "choices"],
    notes: "验收中文选项。"
  },
  {
    id: "real-series-001",
    type: "single_choice",
    title: "p 级数",
    stem: String.raw`级数 $\sum_{n=1}^{\infty}\frac{1}{n^2}$ 的敛散性为 \blankbox`,
    options: [String.raw`收敛`, String.raw`发散`, String.raw`振荡`, String.raw`无法判断`],
    answer: "A",
    analysis: String.raw`p 级数 $\sum\frac{1}{n^p}$ 在 $p>1$ 时收敛。此处 $p=2$。`,
    questionType: "级数",
    difficulty: "基础",
    tags: ["级数", "sum", "infty"],
    notes: "验收 sum 上下限。"
  },
  {
    id: "real-series-002",
    type: "fill_blank",
    title: "等比级数",
    stem: String.raw`\sum_{n=0}^{\infty}\left(\frac{1}{2}\right)^n=\blankbox`,
    options: [],
    answer: String.raw`2`,
    analysis: String.raw`等比级数求和公式：\[\sum_{n=0}^{\infty}q^n=\frac{1}{1-q},\quad |q|<1\] 取 $q=\frac12$ 得 $2$。`,
    questionType: "级数",
    difficulty: "基础",
    tags: ["级数", "等比级数", "left-right"],
    notes: "验收 sum 和括号。"
  },
  {
    id: "real-series-003",
    type: "subjective",
    title: "比较判别",
    stem: String.raw`判断级数 \[\sum_{n=1}^{\infty}\frac{1}{n^2+1}\] 的敛散性。`,
    options: [],
    answer: String.raw`收敛`,
    analysis: String.raw`因为 \[0<\frac{1}{n^2+1}<\frac{1}{n^2}\] 且 $\sum\frac{1}{n^2}$ 收敛，故原级数收敛。`,
    questionType: "级数",
    difficulty: "中等",
    tags: ["级数", "比较判别"],
    notes: "验收不等式和级数。"
  },
  {
    id: "real-series-004",
    type: "subjective",
    title: "幂级数收敛半径",
    stem: String.raw`求幂级数 \[\sum_{n=1}^{\infty}\frac{x^n}{n}\] 的收敛半径。`,
    options: [],
    answer: String.raw`R=1`,
    analysis: String.raw`由根值判别可得收敛半径 $R=1$。端点另行讨论。`,
    questionType: "级数",
    difficulty: "中等",
    tags: ["级数", "幂级数"],
    notes: "验收 x^n/n。"
  },
  {
    id: "real-series-005",
    type: "fill_blank",
    title: "交错级数",
    stem: String.raw`级数 $\sum_{n=1}^{\infty}\frac{(-1)^{n-1}}{n}$ 是 \blankbox`,
    options: [],
    answer: String.raw`条件收敛`,
    analysis: String.raw`交错调和级数收敛，但绝对值级数 $\sum\frac{1}{n}$ 发散，故条件收敛。`,
    questionType: "级数",
    difficulty: "中等",
    tags: ["级数", "交错级数"],
    notes: "验收上标 n-1。"
  },
  {
    id: "real-la-001",
    type: "single_choice",
    title: "二阶行列式",
    stem: String.raw`\left|\begin{matrix}a&b\\c&d\end{matrix}\right|= \blankbox`,
    options: [String.raw`ad-bc`, String.raw`ab-cd`, String.raw`ac-bd`, String.raw`ad+bc`],
    answer: "A",
    analysis: String.raw`二阶行列式公式：\[\left|\begin{matrix}a&b\\c&d\end{matrix}\right|=ad-bc\]。`,
    questionType: "线性代数",
    difficulty: "基础",
    tags: ["线性代数", "行列式", "matrix"],
    notes: "验收 matrix 和竖线。"
  },
  {
    id: "real-la-002",
    type: "fill_blank",
    title: "矩阵乘法维度",
    stem: String.raw`若 $A$ 为 $2\times3$ 矩阵，$B$ 为 $3\times4$ 矩阵，则 $AB$ 为 \blankbox 矩阵。`,
    options: [],
    answer: String.raw`2\times4`,
    analysis: String.raw`矩阵乘法维度为 \[(2\times3)(3\times4)=2\times4\]。`,
    questionType: "线性代数",
    difficulty: "基础",
    tags: ["线性代数", "矩阵"],
    notes: "验收 times。"
  },
  {
    id: "real-la-003",
    type: "subjective",
    title: "线性方程组",
    stem: String.raw`解线性方程组 \[\begin{cases}x+y=3\\x-y=1\end{cases}\]`,
    options: [],
    answer: String.raw`x=2,\ y=1`,
    analysis: String.raw`两式相加得 $2x=4$，故 $x=2$，代回得 $y=1$。`,
    questionType: "线性代数",
    difficulty: "基础",
    tags: ["线性代数", "方程组", "cases"],
    notes: "验收 cases 方程组。"
  },
  {
    id: "real-la-004",
    type: "subjective",
    title: "向量线性相关",
    stem: String.raw`判断向量组 $\boldsymbol{\alpha}_1=(1,0),\boldsymbol{\alpha}_2=(0,1)$ 是否线性相关。`,
    options: [],
    answer: String.raw`线性无关`,
    analysis: String.raw`若 $k_1\boldsymbol{\alpha}_1+k_2\boldsymbol{\alpha}_2=\boldsymbol{0}$，则 \[\begin{cases}k_1=0\\k_2=0\end{cases}\] 故线性无关。`,
    questionType: "线性代数",
    difficulty: "基础",
    tags: ["线性代数", "boldsymbol", "cases"],
    notes: "验收 boldsymbol 和 cases。"
  },
  {
    id: "real-la-005",
    type: "single_choice",
    title: "特征值",
    stem: String.raw`矩阵 $A=\left[\begin{matrix}2&0\\0&3\end{matrix}\right]$ 的特征值为 \blankbox`,
    options: [String.raw`2,3`, String.raw`0,5`, String.raw`1,6`, String.raw`-2,-3`],
    answer: "A",
    analysis: String.raw`对角矩阵的特征值就是主对角线元素，即 $2,3$。`,
    questionType: "线性代数",
    difficulty: "中等",
    tags: ["线性代数", "特征值", "matrix"],
    notes: "验收方括号矩阵。"
  },
  {
    id: "real-la-006",
    type: "subjective",
    title: "逆矩阵",
    stem: String.raw`求矩阵 $A=\left[\begin{matrix}1&0\\0&2\end{matrix}\right]$ 的逆矩阵。`,
    options: [],
    answer: String.raw`A^{-1}=\left[\begin{matrix}1&0\\0&\frac12\end{matrix}\right]`,
    analysis: String.raw`对角矩阵求逆时，对角线元素取倒数：\[A^{-1}=\left[\begin{matrix}1&0\\0&\frac12\end{matrix}\right]\]。`,
    questionType: "线性代数",
    difficulty: "基础",
    tags: ["线性代数", "逆矩阵", "matrix"],
    notes: "验收矩阵和上标 -1。"
  },
  {
    id: "real-solution-001",
    type: "solution",
    title: "答案解析：导数定义",
    stem: String.raw`由导数定义可得：\[\displaystyle f'(x_0)=\lim_{\Delta x\to0}\frac{f(x_0+\Delta x)-f(x_0)}{\Delta x}\] 所以答案为 \blankbox。`,
    options: [],
    answer: String.raw`f'(x_0)`,
    analysis: String.raw`\[\begin{aligned}f'(x_0)&=\lim_{\Delta x\to0}\frac{f(x_0+\Delta x)-f(x_0)}{\Delta x}\\&=\lim_{x\to x_0}\frac{f(x)-f(x_0)}{x-x_0}\end{aligned}\]`,
    questionType: "答案解析",
    difficulty: "基础",
    tags: ["solution", "aligned", "blankbox"],
    notes: "验收解析文字 + 块级公式 + blankbox。"
  },
  {
    id: "real-solution-002",
    type: "solution",
    title: "答案解析：分段函数",
    stem: String.raw`讨论函数 \[f(x)=\begin{cases}x^2,&\text{当 }x>0\\0,&\text{当 }x=0\end{cases}\] 在 $x=0$ 处的连续性。`,
    options: [],
    answer: String.raw`连续`,
    analysis: String.raw`因为 \[\lim_{x\to0^+}x^2=0=f(0)\] 且左侧定义只在题设区间外不讨论，所以在右邻域意义下连续。`,
    questionType: "答案解析",
    difficulty: "中等",
    tags: ["solution", "cases", "text"],
    notes: "验收 \\text{} 中文。"
  },
  {
    id: "real-solution-003",
    type: "solution",
    title: "答案解析：括号伸缩",
    stem: String.raw`化简 \[\left( \frac{x+1}{x-1} \right)^2+\left[ \ln(1+x) \right]\]`,
    options: [],
    answer: String.raw`保持原式`,
    analysis: String.raw`该题用于渲染验收：圆括号应随分式高度伸缩，方括号正常显示。`,
    questionType: "答案解析",
    difficulty: "基础",
    tags: ["solution", "delimiters", "left-right"],
    notes: "验收 left/right 混合括号。"
  },
  {
    id: "real-solution-004",
    type: "solution",
    title: "答案解析：align*",
    stem: String.raw`验证公式组 \[\begin{align*}a^2-b^2&=(a-b)(a+b)\\(x+1)^2&=x^2+2x+1\end{align*}\]`,
    options: [],
    answer: String.raw`恒等式成立`,
    analysis: String.raw`渲染层会将 align* normalize 为 aligned，保证不白屏。`,
    questionType: "答案解析",
    difficulty: "基础",
    tags: ["solution", "aligned", "align*"],
    notes: "验收 align* normalize。"
  },
  {
    id: "real-solution-005",
    type: "solution",
    title: "答案解析：displaystyle",
    stem: String.raw`这是行内公式 $\displaystyle \frac{1}{1+x}$ 的显示效果。`,
    options: [],
    answer: String.raw`\frac{1}{1+x}`,
    analysis: String.raw`行内 \displaystyle 不应导致整段中文拆成多行；块级公式 \[\displaystyle \sum_{n=1}^{\infty}\frac{1}{n^2}\] 正常显示。`,
    questionType: "答案解析",
    difficulty: "基础",
    tags: ["solution", "displaystyle"],
    notes: "验收 displaystyle 行内和块级。"
  },
  {
    id: "real-solution-006",
    type: "solution",
    title: "答案解析：根号",
    stem: String.raw`检查带次数根号 \[\sqrt[3]{x^2+1}\] 与普通根号 \[\sqrt{x+1}\]。`,
    options: [],
    answer: String.raw`渲染正常`,
    analysis: String.raw`若 \sqrt[n]{} 暂不支持，也必须 fallback，不允许页面白屏。当前用于真机验收。`,
    questionType: "答案解析",
    difficulty: "基础",
    tags: ["solution", "sqrt"],
    notes: "验收 sqrt[]{}。"
  },
  {
    id: "real-la-007",
    type: "subjective",
    title: "二次型矩阵表示",
    stem: String.raw`将二次型 $f(x_1,x_2)=x_1^2+2x_1x_2+3x_2^2$ 写成矩阵形式。`,
    options: [],
    answer: String.raw`\boldsymbol{x}^{T}A\boldsymbol{x}`,
    analysis: String.raw`令 \boldsymbol{x}=(x_1,x_2)^T，则 \[f=\boldsymbol{x}^{T}\left[\begin{matrix}1&1\\1&3\end{matrix}\right]\boldsymbol{x}\]。`,
    questionType: "线性代数",
    difficulty: "中等",
    tags: ["线性代数", "二次型", "boldsymbol", "matrix"],
    notes: "验收 boldsymbol、矩阵和转置上标。"
  },
  {
    id: "real-regression-001",
    type: "solution",
    title: "回归：中文 + display math",
    stem: String.raw`计算极限
\[
\lim\limits_{x \to 0} \frac{\sin x}{x}
\]`,
    options: [],
    answer: String.raw`1`,
    analysis: String.raw`该样例用于确认 \[...\] 会被切分为 display math，传给 KaTeX 时不包含外层 delimiter。`,
    questionType: "答案解析",
    difficulty: "基础",
    tags: ["regression", "display", "delimiter"],
    notes: "不应出现 Undefined control sequence: \\[。"
  },
  {
    id: "real-regression-002",
    type: "solution",
    title: "回归：中文 + display math + 后续中文",
    stem: String.raw`由导数定义可得：
\[
f'(x_0)=\lim_{\Delta x\to0}\frac{f(x_0+\Delta x)-f(x_0)}{\Delta x}
\]
所以答案为 \blankbox。`,
    options: [],
    answer: String.raw`f'(x_0)`,
    analysis: String.raw`应切分为 text + displayMath + text + blankbox，blankbox 保持下划线且不异常掉行。`,
    questionType: "答案解析",
    difficulty: "基础",
    tags: ["regression", "display", "blankbox"],
    notes: "验收 display delimiter 剥离和 blankbox。"
  },
  {
    id: "real-regression-003",
    type: "solution",
    title: "回归：中文 + 矩阵/向量公式",
    stem: String.raw`令 $\mathbf{x}=(x_1,x_2)^T$，则
\[
f=\mathbf{x}^{T}A\mathbf{x}
\]`,
    options: [],
    answer: String.raw`\mathbf{x}^{T}A\mathbf{x}`,
    analysis: String.raw`该样例确认中文 + inline math + display math 混排时，\[\] 不会原样进入 KaTeX。`,
    questionType: "线性代数",
    difficulty: "基础",
    tags: ["regression", "matrix", "mathbf"],
    notes: "验收向量公式和 display delimiter。"
  },
  {
    id: "real-regression-004",
    type: "subjective",
    title: "回归：普通纯公式",
    stem: String.raw`\int_0^1 x\sqrt{1+x^2},dx`,
    options: [],
    answer: String.raw`\frac{1}{3}(2\sqrt2-1)`,
    analysis: String.raw`整段没有中文时作为 pure math 渲染，不额外添加 \[...\]。`,
    questionType: "定积分",
    difficulty: "基础",
    tags: ["regression", "integral", "sqrt"],
    notes: "验收纯公式不带 delimiter。"
  },
  {
    id: "real-regression-005",
    type: "subjective",
    title: "回归：块级公式 delimiter",
    stem: String.raw`\[
\int_0^1 x\sqrt{1+x^2},dx
\]`,
    options: [],
    answer: String.raw`\frac{1}{3}(2\sqrt2-1)`,
    analysis: String.raw`该样例用于确认外层 \[ 和 \] 被 stripMathDelimiters 剥离后再传给 KaTeX。`,
    questionType: "定积分",
    difficulty: "基础",
    tags: ["regression", "display", "integral"],
    notes: "验收块级公式 delimiter。"
  }
];

function withChoices(sample: LatexRealSample) {
  if (sample.options.length === 0) {
    return sample.stem;
  }

  const choices = sample.options.map((option) => `{${option}}`).join("");
  return `${sample.stem} \\fourchoices${choices}`;
}

export function getLatexRealContent(sample: LatexRealSample) {
  return withChoices(sample);
}

export function getReviewMockSamples() {
  return latexRealSamples.slice(0, 10);
}

export function getStrengthenMockSamples() {
  return latexRealSamples.slice(10, 20);
}

export function getPracticeMockSamples() {
  return latexRealSamples.slice(0, 20);
}
