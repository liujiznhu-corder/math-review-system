export type ExportableProblem = {
  raw_latex?: string | null;
  rawLatex?: string | null;
  latex_content?: string | null;
  latexContent?: string | null;
};

export function exportProblemLatex(problem: ExportableProblem) {
  return (
    problem.raw_latex ??
    problem.rawLatex ??
    problem.latex_content ??
    problem.latexContent ??
    ""
  );
}
