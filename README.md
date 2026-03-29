# Jiomi Camera

AI 驱动的拍摄助手 MVP — 运行在手机浏览器里，无需安装 App。

## 功能

- **实时姿态估计**：MoveNet 检测人体关键点，给出姿势建议（下巴抬一点、身体侧一点等）
- **构图评估**：规则引擎检测主体位置、头顶裁切、偏移等问题
- **光线分析**：逆光、脸部过暗、曝光不足检测
- **建议引擎**：优先级排序，最多显示 1 条主建议，防止频繁切换
- **连拍 + 自动选片**：按一次快门连拍 5 张，按清晰度/曝光/构图自动评分选出最优
- **风格滤镜**：5 种场景风格（柔和人像、咖啡暖调、街拍冷调、霓虹夜景、旅行清新）
- **拍摄模式**：自拍、人像、探店、旅行、夜景

## 快速开始

```bash
npm install
npm run dev
```

用手机浏览器访问终端输出的本地 IP 地址（如 `http://192.168.x.x:5173`），允许摄像头权限即可使用。

## 目录结构

```
src/
  config/         # 类型定义 + 可配置规则 (rules.json)
  vision/         # 视觉分析模块（场景/姿态/构图/光线）
  strategy/       # 建议排序引擎
  postprocess/    # 选片算法 + 风格预设
  telemetry/      # 埋点追踪
  ui/
    pages/        # 首页 / 相机页 / 结果页
    overlay/      # 实时骨架 + 框线叠加层
```

## 替换真实模型

`src/vision/pose.ts` 中的 `getPoseDetector()` 默认使用 TensorFlow.js MoveNet Lightning（浏览器端推理）。替换为更高精度的 Thunder 版本：

```ts
modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
```

场景分类目前是启发式规则（`src/vision/scene.ts`），接入真实模型时实现 `predictScene(frame)` 接口即可，其他逻辑无需改动。

## 调整建议规则

编辑 `src/config/rules.json` 即可热改文案、开关规则、调整优先级，无需修改代码。

## 构建生产版本

```bash
npm run build
npm run preview
```

部署到任何静态托管（Vercel / Netlify / GitHub Pages）后，手机扫码即可使用。
