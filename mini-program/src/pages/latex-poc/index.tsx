import { View, Text } from "@tarojs/components";
import { LatexRenderer } from "../../components/LatexRenderer";
import { latexSamples } from "../../utils/latexSamples";
import "./index.scss";

export default function LatexPocPage() {
  return (
    <View className="latex-poc-page">
      <View className="latex-poc-header">
        <Text className="latex-poc-title">微信小程序 LaTeX 渲染 POC</Text>
        <Text className="latex-poc-subtitle">
          固定样例验证，不接数据库，不调用后端 API
        </Text>
      </View>

      <View className="latex-poc-note">
        <Text>
          本页同时比较方案 A（小程序端直接解析渲染）和方案 B（转换为
          RichText nodes 后渲染）。
        </Text>
      </View>

      {latexSamples.map((sample) => (
        <LatexRenderer
          key={sample.id}
          title={sample.title}
          description={sample.description}
          latex={sample.latex}
        />
      ))}
    </View>
  );
}
