# Skill-SOP 智能编排与审查工具 · 设计文档

> 日期：2026-08-12
> 状态：待用户审阅
> 版本：v1.0（MVP，场景 A + 场景 B）

---

## 一、项目背景与目标

### 1.1 现状

目前团队已积累一批 Skill（目录：`.agents/skills/`），每个 Skill 包含：

- `SKILL.md`：Frontmatter（name + description）+ 正文（使用场景、流程、脚本等）
- 可选的 `DESIGN.md`、`scripts/`、`mcp/`、`references/` 等

其中 `form-template-sop` 本身就是一个编排了 Skill 的 SOP（6 步流程 + 3 个人工确认卡点 + 显式依赖 `jira-fetcher`），但这些 SOP 仅以 Markdown 文本和 Mermaid 图形式存在，缺乏结构化表达、智能生成能力和量化质量审查手段。

### 1.2 目标

构建一个 **Electron 桌面应用（.exe 安装包分发）**，提供两大核心能力：

| 能力 | 场景 | 说明 |
|------|------|------|
| **SOP 智能生成（场景 A）** | 从零生成 | 用户描述业务目标 + 选择可用 Skill 子集 → LLM 自动编排为结构化 SOP → 用户可微调后导出 |
| **SOP 契合度审查（场景 B）** | 已有 SOP 体检 | 用户导入 Markdown/JSON 格式的已有 SOP → 按用户自定义优先级的 8 个维度进行量化评分 → 输出分级优化建议 + 流程图高亮标注 |

V1 不包含 **C 场景（拖拽式可视化编排画布）**，但技术选型（AntV X6）为 V2 C 场景留足扩展空间。

---

## 二、范围界定

### 2.1 MVP（V1）必做

- ✅ Electron 桌面应用 + electron-builder 打包 Windows 安装包
- ✅ Skill 管理：目录自动扫描（混合模式 C）+ 手动编辑补全
- ✅ 场景 A：SOP 智能生成（LLM Prompt L3）
- ✅ 场景 B：Markdown/Mermaid → 结构化 SOP 解析（LLM Prompt L2）+ 契合度审查（L4）
- ✅ 8 维度可拖拽排序权重配置 + 加权评分算法
- ✅ SOP 详情：AntV X6 只读流程图渲染
- ✅ 评分可视化：AntV G2 雷达图 + 维度条形图 + 分级建议卡
- ✅ 导出：Markdown（给人看）+ JSON（给机器消费）
- ✅ 设置页：用户自填 OpenAI 兼容的 API Key / 模型选择 / Endpoint

### 2.2 V2+ 规划（不纳入本次实现）

- C 场景：画布拖拽编排 + 节点/连线编辑 + 增量软检查
- SOP 版本管理 + diff 对比
- 团队协作（多人共享 Skill 库 / SOP 库）
- SOP 运行时执行引擎（真正跑起来执行脚本）

---

## 三、技术选型（已确认）

| 层 | 技术 | 选型理由 |
|----|------|---------|
| 桌面壳 | **Electron** | 生态成熟，electron-builder 一键出安装包；Node 侧能力完整 |
| 前端框架 | **Vue 3 + TypeScript** | 用户 Vue 2 技术栈无缝迁移；Composition API + TS 类型安全 |
| 构建工具 | **Vite** + **vite-plugin-electron** | 热更新快，构建快，Electron + Vue 一体化开发体验 |
| 状态管理 | **Pinia** | Vue 3 官方推荐，类型友好 |
| 流程图渲染 | **AntV X6** | 阿里出品，文档中文化；节点/连线/缩放能力完整；V2 拖拽编排直接复用 |
| 图表可视化 | **AntV G2** | 与 X6 同生态；雷达图、条形图开箱即用 |
| UI 组件库 | **Element Plus** 或 **Naive UI** | Vue 3 生态主流组件库，二选一（实现时决策） |
| 持久化 | **electron-store** + 本地 JSON 文件 | 无需数据库；配置存 electron-store，Skill/SOP 库存 JSON |
| Markdown 解析 | **gray-matter**（frontmatter）+ **marked** | 解析现有 SKILL.md 格式 |
| LLM SDK | **OpenAI Node SDK**（兼容模式） | 支持 OpenAI、Anthropic、及所有 `/v1/chat/completions` 兼容服务 |
| 打包分发 | **electron-builder** + NSIS | 标准方案，生成一键安装 .exe |

---

## 四、核心数据模型

### 4.1 Skill

```typescript
interface Skill {
  id: string;                              // UUID，首次导入时生成
  name: string;                            // SKILL.md frontmatter.name
  description: string;                     // frontmatter.description（LLM 理解核心）
  source_type: "scan" | "manual";          // 目录扫描 vs 手动创建
  source_path?: string;                    // 扫描导入时的源目录绝对路径

  // —— 扩展字段（扫描导入时为空，可在 Skill 管理页手动补全，或 L1 LLM 辅助推测）——
  tags: string[];
  input_schema?: JSONSchema7;              // JSON Schema Draft-07
  output_schema?: JSONSchema7;
  preconditions: string[];                 // 自然语言描述，如 ["需要用户已登录系统"]
  side_effects: string[];                  // 如 ["会向经办人发送邮件"]
  estimated_duration?: string;             // 如 "约 30 秒"
  related_skill_ids: string[];             // 关联 Skill ID，如 form-template-sop 关联 jira-fetcher

  raw_markdown?: string;                   // 原始 SKILL.md 全文（LLM 深度理解用）
  created_at: number;
  updated_at: number;
}
```

### 4.2 SOP

```typescript
interface SOP {
  id: string;
  name: string;
  goal: string;                              // 场景 A 的输入
  version: string;                           // 语义化版本，默认 "1.0.0"

  nodes: SOPNode[];
  edges: SOPEdge[];

  success_criteria: string[];
  tags: string[];

  source?: "generated" | "imported";
  source_markdown?: string;                  // 场景 B Markdown 导入时保存原文
  created_at: number;
  updated_at: number;
}

type SOPNodeType = "start" | "end" | "skill" | "condition" | "parallel" | "manual";

interface SOPNode {
  id: string;
  type: SOPNodeType;
  title: string;
  description?: string;

  // type=skill 专属
  skill_id?: string;
  input_mapping?: Record<string, string>;    // { 上游输出别名: 当前入参字段名 }
  output_alias?: Record<string, string>;     // { 当前出参字段名: 下游引用别名 }

  // type=condition 专属
  condition_expr?: string;                   // 自然语言或伪代码

  // type=manual 专属
  manual_checklist?: string[];               // 人工核对清单

  // AntV X6 布局用
  position?: { x: number; y: number };
}

interface SOPEdge {
  id: string;
  from: string;                              // 源节点 ID
  to: string;                                // 目标节点 ID
  condition_label?: string;                  // 条件分支标签，如 "确认通过" / "需修改"
}
```

### 4.3 评估维度与审查结果

```typescript
type ReviewDimension =
  | "dependency_integrity"      // 1. 依赖完整性
  | "io_matching"               // 2. 输入输出匹配度
  | "flow_completeness"         // 3. 流程冗余/缺失
  | "manual_gate_reasonable"    // 4. 人工卡点合理性
  | "skill_purity"              // 5. Skill 职责纯度
  | "parallelism"               // 6. 可并行性
  | "granularity_consistency"   // 7. 粒度一致性
  | "description_clarity";      // 8. 描述清晰度

interface ReviewDimensionMeta {
  key: ReviewDimension;
  name: string;                 // 中文名，如 "依赖完整性"
  icon: string;                 // Emoji 或图标名
  description: string;          // 维度说明
  default_rank: number;         // 默认优先级排序（0 = 最高）
}

// 用户可配置的权重设置
interface ReviewConfig {
  dimension_order: ReviewDimension[];   // 数组顺序 = 优先级（第0项权重最高）
}

// LLM 审查返回结果
interface ReviewResult {
  overall_score: number;                                        // 0-100
  dimension_scores: Record<ReviewDimension, {
    score: number;                                              // 0-100
    findings: ReviewFinding[];
  }>;
  summary: string;                                              // 3-5 句中文总结
}

type FindingSeverity = "critical" | "warning" | "suggestion";   // 红 / 黄 / 蓝

interface ReviewFinding {
  id: string;
  severity: FindingSeverity;
  dimension: ReviewDimension;
  title: string;
  detail: string;
  related_node_ids?: string[];                                  // 关联到 SOP 具体节点，前端可高亮
  suggestion?: string;                                          // 可操作的改进建议
  suspected_parse_error?: boolean;                              // L2 Markdown 解析可能不准时标注
}
```

---

## 五、项目结构与模块划分

### 5.1 目录结构

```
skill-manager/
├── electron/                                  # Electron 主进程 (Node.js)
│   ├── main.ts                               # 入口：创建窗口 + 注册 IPC
│   ├── preload.ts                            # 暴露 contextBridge API
│   └── core/
│       ├── skill-scanner.ts                  # 目录扫描 + SKILL.md 解析 (gray-matter)
│       ├── storage.ts                        # electron-store + JSON 文件读写
│       ├── llm-client.ts                     # OpenAI SDK 封装（兼容模式）
│       ├── sop-importer.ts                   # B场景：Markdown → 结构化 SOP (调 L2 LLM)
│       ├── sop-exporter.ts                   # 导出 SOP → Markdown + JSON
│       ├── review-engine.ts                  # 加权评分计算（纯函数）
│       └── ipc-handlers.ts                   # IPC 路由分发
│
├── src/                                       # 渲染进程 (Vue 3)
│   ├── App.vue
│   ├── main.ts
│   ├── router/index.ts
│   ├── stores/                                # Pinia
│   │   ├── skill.store.ts
│   │   ├── sop.store.ts
│   │   ├── review.store.ts
│   │   └── settings.store.ts
│   ├── layout/MainLayout.vue                  # 左侧导航 + 顶栏
│   ├── views/
│   │   ├── dashboard/Dashboard.vue            # 首页概览
│   │   ├── skills/                            # Skill 管理
│   │   │   ├── SkillList.vue                  # 列表（搜索/筛选/扫描刷新）
│   │   │   └── SkillEditorDrawer.vue          # 右侧抽屉：编辑扩展字段
│   │   ├── sop-generator/                     # 场景 A
│   │   │   ├── GeneratorForm.vue              # 目标输入 + Skill 多选
│   │   │   └── GeneratorResult.vue            # 生成结果 + 跳转详情
│   │   ├── sop-review/                        # 场景 B
│   │   │   ├── ReviewImport.vue               # 导入 Markdown/JSON / 从历史选择
│   │   │   ├── ReviewConfigPanel.vue          # 8 维度拖拽排序
│   │   │   ├── ReviewResultView.vue           # 综合分 + 雷达图 + 分级建议列表
│   │   │   └── FlowHighlight.vue              # 流程图上高亮问题节点（X6 + 侧栏联动）
│   │   ├── sop-detail/SOPDetail.vue           # A/B 场景通用：X6 只读流程图 + 节点侧栏 + 导出
│   │   └── settings/
│   │       ├── LlmConfig.vue                  # API Key / 模型 / Endpoint / 连通性测试
│   │       ├── StorageConfig.vue              # Skill 扫描目录配置 + 手动触发扫描
│   │       └── About.vue
│   ├── components/
│   │   ├── flow/
│   │   │   ├── X6Canvas.vue                   # X6 基础画布封装（只读模式）
│   │   │   └── node-shapes/                   # 自定义节点形状：skill / condition / manual / start / end
│   │   ├── chart/
│   │   │   ├── RadarScoreChart.vue            # AntV G2 雷达图（8 维度）
│   │   │   └── DimensionScoreBar.vue          # 各维度评分条形图
│   │   └── common/
│   └── shared/                                # ⚠️ 前后端共享，绝对不能引 Node/Vue 专属 API
│       ├── types/
│       │   ├── skill.ts
│       │   ├── sop.ts
│       │   └── review.ts
│       ├── constants/
│       │   └── dimensions.ts                  # 8 维度元信息数组（中文、图标、默认排序）
│       └── utils/
│           └── score.ts                       # 加权评分算法（纯函数，前后端都可用）
│
├── resources/                                  # Electron 打包静态资源
├── package.json
├── vite.config.ts                              # vite-plugin-electron 配置
├── electron-builder.yml                        # NSIS 安装包配置
├── tsconfig.json
└── tsconfig.node.json                          # Electron 主进程 TS 配置
```

### 5.2 导航结构

```
左侧菜单
├── 🏠 首页 Dashboard
├── 🛠  Skill 库管理
├── ✨ SOP 智能生成  (场景 A)
├── 🔍 SOP 审查优化  (场景 B)
├── 📚 SOP 历史库
└── ⚙️ 设置
     ├── LLM 配置
     ├── 存储与扫描
     └── 关于
```

---

## 六、LLM Prompt 工程设计

### 6.1 LLM 调用总览

| ID | 触发时机 | 输入 | 输出 | 失败兜底 |
|----|---------|------|------|---------|
| **L1** | 用户在 Skill 管理页点击「AI 补全字段」 | Skill.raw_markdown | Skill 扩展字段 JSON (tags / input_schema / output_schema / preconditions / side_effects) | 用户手动填写 |
| **L2** | 场景 B 导入 Markdown SOP 后 | Markdown 全文 + Skill 库索引 (name→description→id) | 结构化 SOP JSON (nodes + edges + success_criteria) | 保留原文，用户手动映射 |
| **L3** | 场景 A 点击「生成 SOP」 | 用户 goal + 选中的 Skill 列表 + ReviewConfig 维度优先级 | 结构化 SOP JSON + explanation | 降低温度重试一次 |
| **L4** | 场景 B 点击「开始审查」 | 结构化 SOP + 用到的 Skill 详情 + ReviewConfig | ReviewResult JSON | 降低温度重试一次 |

### 6.2 Prompt 结构（核心思路）

> 完整 Prompt 在实现时写入 `electron/core/prompts/` 目录，此处列核心要素。

#### L3（场景 A：SOP 生成）

```markdown
【系统角色】SOP 编排专家。根据用户目标与 Skill 库，编排一个结构合理、可落地的 SOP。

【编排原则（按优先级排序，由 ReviewConfig.dimension_order 动态生成）】
1. 依赖完整性：每个 Skill 的前置条件必须被上游满足
2. 输入输出可追溯：...
3. 关键卡点人工确认：AI 分析结果、生成文档处须插入 manual 节点
...（随用户维度顺序变化）

【可用 Skill 库】
{{ 遍历 selected_skills：
- id / name / description / preconditions / input_schema（如有）
}}

【用户目标】{{ goal }}

【节点类型约定】
- start / end：首尾固定节点
- skill：绑定一个 Skill，必须有 skill_id
- manual：人工卡点，必须有 manual_checklist 字符串数组
- condition：条件分支，必须有 condition_expr，出边必须带 condition_label
- parallel：并行汇聚/分发节点

【输出格式（仅 JSON，禁止额外解释）】
{
  "nodes": [...],
  "edges": [...],
  "success_criteria": ["..."],
  "explanation": "一段中文，说明编排决策的关键理由"
}
```

#### L4（场景 B：契合度审查）

```markdown
【系统角色】SOP 质量评审专家。按维度优先级评分，输出可操作的分级优化建议。

【维度优先级（由 ReviewConfig 动态传入）】
1. dependency_integrity：...（维度说明）
2. io_matching：...
...（共 8 项，按用户排序）

【评分规则】
- 每项 0-100 分
- severity 分三档：
  critical（红）：阻塞性问题，必须修
  warning（黄）：重要缺陷，建议修
  suggestion（蓝）：优化建议，可选修
- 每条 finding 必须有 suggestion（可操作的改进建议）
- 如果某问题疑似由 Markdown → SOP 解析错误导致，标记 suspected_parse_error=true

【Skill 详情】
{{ SOP 引用到的所有 Skill 完整信息 }}

【待审查 SOP JSON】
{{ 完整 SOP }}

【输出格式（仅 JSON）】ReviewResult 结构（见第四章）
```

### 6.3 容错策略

- 所有 LLM 调用都走 `llm-client.ts` 封装，内置：
  - JSON 模式（`response_format: { type: "json_object" }`，OpenAI 支持；不支持的模型走后验 JSON 提取 + zod 校验）
  - 输出 zod schema 校验不通过时自动重试 1 次（降低 temperature）
  - 2 次都失败时，抛给前端提示「LLM 输出解析失败，请重试或调整 Prompt」
- L2（Markdown → SOP 解析）标注 suspected_parse_error，提醒用户确认

---

## 七、契合度加权评分算法

### 7.1 权重分配

```typescript
// src/shared/utils/score.ts
export function calculateWeights(dimensionOrder: ReviewDimension[]): Record<ReviewDimension, number> {
  const DECAY_FACTOR = 0.8;    // 衰减因子：越靠后权重越低，但保证后几名权重不为 0
                                 // 0.8 下，第1名权重约 20%，第8名约 4%，分布更均衡
  const weights = {} as Record<ReviewDimension, number>;
  let rawTotal = 0;

  dimensionOrder.forEach((dim, idx) => {
    const raw = Math.pow(DECAY_FACTOR, idx);   // idx=0 → 1.0, idx=1 → 0.8, idx=2 → 0.64 ...
    weights[dim] = raw;
    rawTotal += raw;
  });

  // 归一化到 100%（方便展示百分比）
  Object.keys(weights).forEach(dim => {
    weights[dim] = Math.round((weights[dim] / rawTotal) * 1000) / 10;  // 保留 1 位小数
  });

  return weights;
}
```

**8 维度默认排序下的权重示例**：

| 排序 | 维度 | 权重 |
|:---:|------|:---:|
| 1 | 依赖完整性 | 20.2% |
| 2 | 输入输出匹配度 | 16.2% |
| 3 | 流程冗余/缺失 | 12.9% |
| 4 | 人工卡点合理性 | 10.3% |
| 5 | Skill 职责纯度 | 8.3% |
| 6 | 可并行性 | 6.6% |
| 7 | 粒度一致性 | 5.3% |
| 8 | 描述清晰度 | 4.2% |

### 7.2 综合分计算

```typescript
export function calculateOverallScore(
  dimensionOrder: ReviewDimension[],
  dimensionScores: Record<ReviewDimension, number>
): number {
  const weights = calculateWeights(dimensionOrder);
  let total = 0;
  dimensionOrder.forEach(dim => {
    total += (dimensionScores[dim] * weights[dim]) / 100;
  });
  return Math.round(total);
}
```

### 7.3 综合分 → 视觉映射

| 分数区间 | 颜色 | 文案 |
|:-------:|------|------|
| 0-59 | #ef4444 红 | ❌ 不合格 · 存在阻塞性问题，必须修复后再投入使用 |
| 60-74 | #f59e0b 黄 | ⚠️ 需优化 · 可行性基本满足，有多项改进空间 |
| 75-89 | #10b981 浅绿 | ✅ 良好 · 可投入使用，建议参考建议项优化 |
| 90-100 | #0ea5e9 深绿 | 🌟 优秀 · 编排合理，维度均衡 |

---

## 八、导出格式

### 8.1 JSON 导出（给机器消费）

```typescript
// sop-exporter.ts
function exportToJSON(sop: SOP): string {
  return JSON.stringify({
    schema_version: "1.0",
    exported_at: new Date().toISOString(),
    ...sop
  }, null, 2);
}
```

### 8.2 Markdown 导出（给人看，对齐现有 SKILL.md 风格）

```markdown
---
name: {sop.name}
version: {sop.version}
goal: {sop.goal}
---

# {sop.name}

## 目标
{sop.goal}

## 流程

### Mermaid 图
```mermaid
flowchart TB
  {{ 遍历 nodes/edges 生成 Mermaid 语法 }}
```

### 步骤详情
| 序号 | 节点 | 类型 | 绑定 Skill | 说明 | 人工核对项 |
|:---:|------|------|-----------|------|:----------:|
| 1 | ... | ... | ... | ... | - |

## 成功判定标准
- {{ 遍历 success_criteria }}

## 优化建议（如有审查结果附带）
> 导出时若附带最近一次 ReviewResult，可追加本章节
- 🔴（critical）...
- 🟡（warning）...
- 🔵（suggestion）...
```

---

## 九、IPC 通道清单（前后端通信契约）

所有通道通过 `preload.ts` 的 `contextBridge.exposeInMainWorld("api", {...})` 暴露，命名空间统一：

| 通道 | 方向 | 说明 |
|------|------|------|
| `skill:scanDirectory(dirPath)` | Renderer → Main | 扫描指定目录，返回解析到的 Skill 列表 |
| `skill:getAll()` | Renderer → Main | 获取全部 Skill |
| `skill:save(skill)` | Renderer → Main | 新增或更新 Skill |
| `skill:delete(id)` | Renderer → Main | 删除 Skill |
| `skill:llmEnrich(id)` | Renderer → Main | 调 L1：AI 补全 Skill 扩展字段 |
| `sop:getAll()` | Renderer → Main | 获取 SOP 列表（摘要） |
| `sop:get(id)` | Renderer → Main | 获取 SOP 详情 |
| `sop:save(sop)` | Renderer → Main | 新增或更新 SOP |
| `sop:delete(id)` | Renderer → Main | 删除 SOP |
| `sop:generate(payload: {goal, selectedSkillIds, reviewConfig})` | Renderer → Main | 调 L3：SOP 智能生成 |
| `sop:importMarkdown(text, reviewConfig)` | Renderer → Main | 调 L2：Markdown 解析为结构化 SOP |
| `sop:review(sopId, reviewConfig)` | Renderer → Main | 调 L4：契合度审查，返回 ReviewResult |
| `sop:export(id, format: "json" \| "md")` | Renderer → Main | 返回导出内容字符串，由前端调 `dialog.showSaveDialog` 保存 |
| `settings:get()` | Renderer → Main | 获取全部设置（LLM Key、扫描目录等） |
| `settings:save(config)` | Renderer → Main | 更新设置 |
| `settings:testLlmConnection()` | Renderer → Main | 发一条 ping 请求测试 LLM 连通性 |

**安全策略**：preload 只暴露上述白名单方法；主进程对传入的路径参数做 normalize + 合法性校验（禁止越权访问非 Skill 目录）。

---

## 十、MVP 里程碑

| 里程碑 | 内容 | 完成标志 |
|:-----:|------|---------|
| M1 基础框架 | Electron + Vue3 + Vite 跑通；Pinia + Router + Layout + 导航 | 点击左侧菜单能切页，打包 .exe 能正常安装启动 |
| M2 Skill 管理 | 目录扫描 + SKILL.md 解析；Skill 列表；手动编辑保存；electron-store 持久化 | 扫描 `.agents/skills/` 能识别 4 个现有 Skill 并显示 frontmatter |
| M3 LLM 能力封装 | llm-client.ts；L1（Skill 字段补全）连通性测试通过 | 设置页填 API Key 后，L1 能返回结构化字段 |
| M4 场景 A | L3 Prompt + 结果落 SOP 库 + X6 只读流程图 + 节点侧栏 | 输入"配置报销单"目标，能生成包含 jira-fetcher / form-template-sop / schema-creator 的 SOP 并渲染流程图 |
| M5 场景 B 解析 | L2 Markdown → SOP 解析 | 导入 form-template-sop 的 SKILL.md 能解析出 6 步 + 3 个人工确认节点 |
| M6 场景 B 审查 + 可视化 | L4 Prompt + ReviewConfig 拖拽排序 + 加权评分算法 + 雷达图 + 分级建议卡 + X6 高亮联动 | 对 form-template-sop 能给出 70-85 分，且给出"职责过重建议拆分"、"缺少 Step3→Step4 输入映射"等 finding |
| M7 导出 + 设置页完善 | Markdown / JSON 导出；LLM 配置、扫描目录配置、About 页 | 导出的 Markdown 格式对齐本 §8.2 |
| M8 打包交付 | electron-builder 配置；NSIS 安装包；README 启动/打包说明 | 产出可分发的 .exe 安装包，首次启动引导用户配置 API Key + 选择 Skill 扫描目录 |

---

## 十一、风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| LLM（尤其 L2 解析 Markdown → SOP）输出不稳定 | B 场景解析结果错误率高 | ① zod schema 校验 + 自动重试；② 标注 suspected_parse_error；③ 提供「人工编辑 SOP 节点」兜底 |
| 用户对 8 维度权重理解有偏差，导致评分不符合预期 | 用户对评分结果不信任 | ① 每个维度悬浮提示维度说明；② 评分面板展示各维度原始分 + 权重 × 得分的计算过程（透明化） |
| AntV X6 自定义节点样式与 Electron 高 DPI 适配问题 | 流程图显示模糊 | 统一 devicePixelRatio；打包时测试 100%/125%/150% 三种缩放 |
| Electron 打包体积过大（~120MB） | 分发下载慢 | 接受现状；V2 可评估 Tauri 替换 |
