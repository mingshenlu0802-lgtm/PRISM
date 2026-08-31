# PRISM 棱镜

**全球女性主义与 LGBTQIA+ 深度媒体、研究与事实核查平台 — 交互原型**

> ⚠️ **这是一个原型。本仓库中的每一条新闻、来源、数据、引用、机构与人物都是虚构的演示内容。**
> 所有司法辖区、法院、统计机构、期刊、媒体与组织均为杜撰；所有来源链接位于保留域名
> `demo.prism.invalid`（RFC 2606），永远无法解析。本仓库不包含、也不应被当作任何真实报道或真实引用。

PRISM 由两个部分组成：

1. **公众内容网站** — 每日更新的深度文章、事实核查、研究雷达与更正记录。
2. **PRISM Command** — 仅供主编使用的终极编辑控制端：审批队列、文章工作台、版本比较、
   图像工作室、每日编辑简报与全局发布锁。

系统的核心约定是：**AI 负责搜集、整理、核查与生成草稿；人负责最终编辑权与发布权。**
自动编辑台永远不能自行公开发布任何内容。

---

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览构建产物

npm run validate   # 演示数据完整性检查（引用、来源、图表、风险标记、占位链接）
npm run smoke      # 行为冒烟测试（发布闸门、全局锁、版本模型、Vibe 引擎）
npm run check      # 类型检查 + 上述两项
```

技术栈：Vite · React 18 · TypeScript（strict）· react-router-dom（HashRouter，可直接静态托管）。
没有 UI 框架依赖：设计系统、图表与插图全部为手写 CSS 与 SVG。

演示状态保存在浏览器 `localStorage`（键 `prism.console.v1`）。
在 **PRISM Command → 发布控制** 页面可一键重置为初始演示数据。

---

## 站点地图

### 公众网站
| 路径 | 内容 |
|------|------|
| `/` | 今日棱镜：头条、当日核查、议题栏目、全球覆盖、最新研究 |
| `/article/:slug` | 深度文章：九个固定章节、行内引用、图表、时间线、分歧对照、完整 references |
| `/fact-checks` · `/fact-checks/:id` | 事实核查索引与详情（八级结论阶梯） |
| `/topic/:topicKey` | 八个议题栏目 |
| `/method` | 编辑方法与证据标准：结论阶梯、来源政策、创伤知情写作准则、图像政策、AI 披露 |
| `/corrections` | 全站更正、澄清、更新与撤回记录 |
| `/about` | 关于 PRISM 与核心原则 |

### PRISM Command（`/command`）
| 路径 | 内容 |
|------|------|
| `/command` | 总览：今日五个重要事件、待审文章、高风险、引用失败、排程与已发布、需更新、全球分布、自动编辑台运行状态 |
| `/command/queue` | 审批队列：七种编辑决定与发布前确认流程 |
| `/command/article/:id` | 文章工作台（三栏：材料 / 文章 / AI 助手与发布控制），含 Further Vibe Coding |
| `/command/article/:id/versions` | 版本历史与差异比较（含 references 增删） |
| `/command/article/:id/studio` | 图像与图表工作室（概念插图、数据图表、社交素材） |
| `/command/signals` | 今日信号：多国多语言搜集、重复报道合并、选题价值评估 |
| `/command/research` | 研究雷达与可疑说法观察 |
| `/command/sources` | 来源库与全球议题 / 语言 / 来源类型分布 |
| `/command/brief` | 每日编辑简报（仅摘要与安全链接） |
| `/command/audit` | 完整操作、审批与发布记录 |
| `/command/settings` | Global Publishing Lock 与系统设置 |

---

## 编辑原则（写进了产品的行为里，不只是文案）

- **不虚构来源。** 每条 `Source` 都带 `demo: true` 与 `.invalid` 占位链接；界面上以「示例链接（不可访问）」呈现且不可跳转。
- **区分事实、推断、指控、观点与司法结论。** 文章章节结构（`SECTION_ORDER`）强制这一区分，
  时间线节点用 `documented / reported / contested` 三种形状标注证据地位。
- **八级事实核查结论**：有充分证据支持 / 基本属实但缺乏语境 / 部分属实 / 证据存在冲突 /
  缺乏足够证据 / 具有误导性 / 基本不实 / 无法核实。每级都写明所需的证据门槛。
- **创伤知情、受害者中心。** 涉及性暴力的条目必须设置内容提示；图像层永不呈现当事人形象或案发现场。
- **不制造虚假平衡。** `divergence` 区块要求为每种立场标注证据强度，并解释编辑团队为何不等量看待。
- **承认不确定性。** 每篇文章都有「尚未确定的信息」章节，且更正记录公开保存。
- **人保留最终权力。** `publishGate()` 会在发布前列出硬阻断项与警告项；性暴力、未成年人、
  司法程序中与可能暴露身份的内容必须逐项勾选并键入确认短语。
- **Global Publishing Lock。** 一处开关即可暂停全站公开发布；开启时即便点击「批准并立即发布」，
  系统也只会记录批准、不会公开。

---

## 代码结构

```
src/
  lib/
    types.ts        领域模型（文章、来源、引用、核查、风险、版本、简报、流水线、审计）
    constants.ts    议题、结论阶梯、章节、风险、决定、状态标签
    selectors.ts    派生状态：队列、风险评分、引用健康度、发布闸门、分布统计
    store.tsx       Reducer + Context + localStorage 持久化
    diff.ts         中文友好的词级 LCS 差异与区块级差异
    vibe.ts         Further Vibe Coding 指令引擎（确定性规则，非随机生成）
    demo/           全部虚构演示数据（来源库、图表、十篇文章、信号、研究、简报、流水线、审计）
  components/
    common/         设计系统原子组件
    charts/         手写 SVG 图表与示意投影
    visual/         概念插图渲染器（程序化 SVG，永不呈现真实人物或场景）
    public/         公众网站组件
    command/        控制端组件
  pages/            公众页面与控制端页面
  styles/           设计令牌与基础层
```

## 设计语言

深靛蓝（`--ink-*`）＋ 暖白（`--paper-*`）＋ 珊瑚红（`--coral-*`），
克制的棱镜光线（`--prism-1..6`，只用于细线与小色块）与地图网格纹理。
公众站为暖白研究期刊质感（含深色主题），控制端为低光编辑室质感。
不使用彩虹渐变，不使用刻板性别符号。

## 无障碍

语义化元素、可见焦点环、模态框焦点陷阱与 Esc 关闭、`role="tablist"` 选项卡、
图表提供 `<title>`/`<desc>` 与可聚焦数据点、绝不仅以颜色传达含义、
支持 `prefers-reduced-motion`，360px 宽度下无横向滚动。
