import { defineConfig } from "@tarojs/cli";

export default defineConfig({
  projectName: "jiangsu-math-review-mini-program",
  date: "2026-06-13",
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: {
    type: "webpack5"
  },
  mini: {},
  h5: {}
});
