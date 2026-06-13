export default defineAppConfig({
  pages: [
    "pages/home/index",
    "pages/review/index",
    "pages/strengthen/index",
    "pages/mistake/index",
    "pages/profile/index",
    "pages/latex-poc/index"
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#0F4F3F",
    navigationBarTitleText: "数学错题复盘",
    navigationBarTextStyle: "white"
  },
  tabBar: {
    color: "#53635C",
    selectedColor: "#0F4F3F",
    backgroundColor: "#FFFFFF",
    borderStyle: "white",
    list: [
      {
        pagePath: "pages/home/index",
        text: "首页"
      },
      {
        pagePath: "pages/review/index",
        text: "复习"
      },
      {
        pagePath: "pages/strengthen/index",
        text: "巩固"
      },
      {
        pagePath: "pages/mistake/index",
        text: "错题"
      },
      {
        pagePath: "pages/profile/index",
        text: "我的"
      }
    ]
  }
});
