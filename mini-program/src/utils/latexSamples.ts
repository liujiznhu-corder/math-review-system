export type LatexSample = {
  id: string;
  title: string;
  description: string;
  latex: string;
};

export const latexSamples: LatexSample[] = [
  {
    id: "integral-frac-upper",
    title: "定积分上下限分式",
    description: "验收重点：上限 \\frac{\\pi}{2} 必须显示为真正分式。",
    latex: String.raw`\int_{0}^{\frac{\pi}{2}} \sin^{4} x \cos^{2} xdx`
  },
  {
    id: "limit-frac",
    title: "极限与分式",
    description: "验证 lim 下标和普通分式。",
    latex: String.raw`\lim\limits_{x\to0} \frac{\sin x}{x}`
  },
  {
    id: "sum-infinity",
    title: "求和与无穷",
    description: "验证 sum 上下限、infty 和分母上标。",
    latex: String.raw`\sum\limits_{n=1}^{\infty} \frac{1}{n^{2}}`
  },
  {
    id: "nested-frac-sqrt",
    title: "嵌套分式",
    description: "验证分式中的上标和根号递归解析。",
    latex: String.raw`\frac{x^{2}+1}{\sqrt{x+1}}`
  },
  {
    id: "sqrt",
    title: "根号",
    description: "验证 sqrt 内部上标递归解析。",
    latex: String.raw`\sqrt{x^{2}+1}`
  },
  {
    id: "trig-power",
    title: "三角函数幂次",
    description: "验证 \\sin^{2}x、\\cos^{2}x，以及 normalize 对 \\sin^2 x 的兼容。",
    latex: String.raw`\sin^{2}x+\cos^{2}x=1`
  },
  {
    id: "derivative-mark",
    title: "导数记号",
    description: "验证 f'(x) 普通数学字符展示。",
    latex: String.raw`f'(x)`
  },
  {
    id: "subscript",
    title: "下标",
    description: "验证普通变量下标。",
    latex: String.raw`a_{n}+b_{n}`
  },
  {
    id: "blankbox",
    title: "填空",
    description: "验证自定义 \\blankbox。",
    latex: String.raw`\blankbox`
  },
  {
    id: "fourchoices",
    title: "选择题",
    description: "验证 \\fourchoices 每个选项中的行内分式。",
    latex: String.raw`\fourchoices{$\frac{1}{2}$}{$\frac{\pi}{2}$}{$0$}{$1$}`
  },
  {
    id: "choice-stem",
    title: "复杂选择题题干",
    description: "验证中文题干、行内公式、blankbox 和 fourchoices 组合。",
    latex: String.raw`已知 $f(x)$ 的一个原函数是 $\ln |3x-1|$, 则 $\int f(3x),dx=$ \blankbox \fourchoices{$\frac{1}{3}\ln |9x-1|+C$}{$\frac{1}{3}\ln |3x-1|+C$}{$\ln |9x-1|+C$}{$3\ln |9x-1|+C$}`
  },
  {
    id: "unsupported-cases",
    title: "暂不支持：分段函数",
    description: "cases 暂不支持，应 fallback，不能白屏。",
    latex: String.raw`f(x)=\begin{cases}x^2,&x>0\0,&x=0\end{cases}`
  },
  {
    id: "nonstandard-integral-note",
    title: "不推荐写法提醒",
    description: "不强行修复 \\int_0^\\pi/2；推荐写法是 \\int_{0}^{\\frac{\\pi}{2}}。",
    latex: String.raw`\int_0^\pi/2 \sin^2 x , dx`
  }
];
