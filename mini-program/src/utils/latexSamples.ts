export type LatexSample = {
  id: string;
  title: string;
  description: string;
  latex: string;
};

export const latexSamples: LatexSample[] = [
  {
    id: "choice",
    title: "选择题",
    description: "验证行内公式、积分、blankbox、fourchoices、frac、ln。",
    latex: String.raw`已知 $f(x)$ 的一个原函数是 $\ln |3x-1|$, 则 $\int f(3x),dx=$ \blankbox

\fourchoices
{$\frac{1}{3}\ln |9x-1|+C$}
{$\frac{1}{3}\ln |3x-1|+C$}
{$\ln |9x-1|+C$}
{$3\ln |9x-1|+C$}`
  },
  {
    id: "blank",
    title: "填空题",
    description: "验证 lim、sin、frac 与填空题下划线。",
    latex: String.raw`\lim_{x \to 0} \frac{\sin x}{x} = \_\_\_`
  },
  {
    id: "calculation",
    title: "计算题",
    description: "验证定积分、sin、cos、pi、指数和上下标文本展示。",
    latex: String.raw`\int_0^{\pi/2} \sin^4 x \cos^2 x , dx`
  },
  {
    id: "sum-sqrt-infinity",
    title: "补充语法",
    description: "验证 sum、sqrt、infty。",
    latex: String.raw`\sum_{n=1}^{\infty} \frac{1}{\sqrt{n^2+1}}`
  },
  {
    id: "long-formula",
    title: "长公式",
    description: "验证长公式横向滚动和嵌套 frac。",
    latex: String.raw`\lim_{x \to 0} \frac{\sin x - x + \frac{x^3}{6}}{x^5}`
  },
  {
    id: "invalid",
    title: "失败降级",
    description: "故意放入不完整 frac，验证失败时显示原始 LaTeX。",
    latex: String.raw`\frac{1}{`
  }
];
