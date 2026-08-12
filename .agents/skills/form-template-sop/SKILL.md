---
name: form-template-sop
description: 表单模板生成标准化 SOP。通过"先分析 UI，再生成确认文档，后配置"的三段式流程，解决 AI 生单中前置信息缺失、UI 理解偏差、联动边界遗漏等系统性问题。适用于新单据配置前的信息收集、UI 分析、确认文档生成阶段，**在切换到 schema-creator 之前使用**。
---

# 表单模板生成 SOP

## 使用场景

在开始配置新单据的 form.json 之前，使用本流程完成信息收集和确认。

### 何时使用

- 接到新单据配置任务，需收集前置信息
- UI 截图已提供，需结构化分析字段
- 需生成确认文档供人工 Review
- 需建立可追溯的任务记录

### 何时不使用

- 直接修改已有 form.json（应使用 schema-creator）
- 批量搜索/对比 schema（应使用 schema-organizer）
- 确认文档已通过，进入配置阶段（切换到 schema-creator）

## 六步流程

```
Step 0 ──→ Step 1 ──→ Step 2a ──→ Step 2b ──→ [用户确认] ──→ Step 3 ──→ [人工 Review] ──→ Step 4
 要素收集     任务创建     AI 分析    HTML 可视化   分析结果确认    元数据富化    确认通过      生成实施
 Jira解析     资料同步     JSON输出   线框图预览                   生成确认文档               文档 (Spec)

依赖 Skill: jira-fetcher
```

**三个关键确认点**：
1. **Step 2 完成后**：用户确认分析结果（字段名、布局、组件类型、联动规则）正确。
2. **Step 3 完成后**：人工 Review 确认文档，核对接口字段映射、字典编码。
3. **Step 4 完成后**：生成最终实施文档，作为 `schema-creator` 的核心输入上下文。

### Step 0：要素收集（使用 jira-fetcher）

使用 `jira-fetcher` Skill 获取 Jira 任务信息：

```bash
python .agents/skills/jira-fetcher/scripts/fetch.py <Jira链接>
python .agents/skills/jira-fetcher/scripts/export.py <Jira链接>
```

**产出**：
- Jira 任务详情（JSON）
- 离线文档（index.md + 附件截图）

### Step 1：整合创建任务文件夹

将 Step 0 收集的要素整合，创建标准化任务目录。

**命名规范**：`{Jira编号}-{医院名称}-{单据简称}`，如 `YLZHXT-4428-重庆儿童医院-科室进修批次申请`

```bash
python3 .agents/skills/form-template-sop/scripts/step1-init-task.py "YLZHXT-4428-重庆儿童医院-科室进修批次申请"
```

**能力保证**：该脚本会自动在 `doc/` 目录下搜索匹配的 Jira 导出文件夹，并将 `index.md` 和所有附件图片同步至 `原始资料/` 目录，确保前置要素不缺失。

将在当前目录创建 `tasks/<任务名称>/` 目录：

```
tasks/<任务名称>/
├── 原始资料/          # UI 截图、接口文档等
├── 分析结果/          # AI 分析输出（JSON 规则文件）
├── 确认文档/          # 待人工 Review 的确认文档（包含风险项）
└── 配置产出/          # 最终 schema 配置产出
```

同时写入 `任务元信息.json`，记录 JIRA 链接、院区、单据名称等要素。

### Step 2：AI 分析 UI

**执行流程**：AI 查看截图 → 输出 `analysis-result.json` → 脚本生成 HTML 可视化 → **用户确认**

#### Step 2a：生成 JSON 分析结果

AI 直接查看截图，凭借视觉理解能力分析 UI，输出结构化字段清单 JSON。

**输出路径**：`tasks/<任务名>/分析结果/{Jira编号}-{终端}-分析结果.json`

**JSON 完整结构**：

```json
{
  "task_info": {
    "jira_id": "Jira编号",
    "hospital": "院区名称",
    "form_name": "单据名称",
    "terminal": "PC 或 移动端",
    "version": "版本号",
    "analysis_time": "分析日期"
  },

  "sections": [
    {
      "title": "单据头部",
      "type": "header",
      "status": "待提交",
      "fields": [
        { "label": "单据编号", "value": "AUTO", "auto": true },
        { "label": "申请日期", "value": "2024-12-19", "auto": true },
        { "label": "申请人", "value": "张三", "auto": true },
        { "label": "所属部门", "value": "神经外科", "auto": true }
      ]
    },
    {
      "title": "分区标题",
      "grid": 3,
      "fields": [
        { "title": "字段标签", "component": "组件类型",
          "required": true, "gridSpan": 1, "auto_fill": false, "read_only": false,
          "default_value": "默认值（可选）", "notes": "补充说明（可选）" }
      ]
    },
    {
      "title": "表格分区",
      "type": "table",
      "columns": [
        { "title": "列名", "required": true, "width": "列宽（可选，如 60px）" }
      ]
    }
  ],

  "fields": [
    { "seq": 1, "title": "字段标签", "component": "组件类型",
      "required": true, "auto_fill": false, "reaction": "联动说明 或 -",
      "notes": "补充说明", "gridSpan": 1 }
  ],

  "reactions": [
    { "type": "自动计算 / 条件显示 / 自动回填", "description": "联动描述" }
  ],

  "risks": [
    { "type": "UI 歧义 / 字段缺失 / 联动边界", "description": "风险描述" }
  ],

  "pc_mobile_diff": {
    "layout": ["布局差异项"],
    "component": ["组件差异项"]
  }
}
```

**关键字段说明**：

| 字段 | 用途 | 示例 |
|------|------|------|
| `sections[].type` | `"header"` 头部元数据行 / `"table"` 表格分区 / 不设则为表单栅格 | `"header"` |
| `sections[].grid` | 表单分区列数，PC 通常 3，移动端 1。header 类型无此属性 | `3` |
| `sections[].status` | 仅 header 类型，单据状态标签 | `"待提交"` |
| `header fields[].label` | 头部元数据标签 | `"单据编号"` |
| `header fields[].value` | 头部元数据值（从截图读取） | `"A21331223442"` |
| `header fields[].auto` | 头部字段均为自动带出 | `true` |
| `fields[].gridSpan` | 表单字段占用列数，默认 1；跨整行填 grid 值。头部字段为 0 | `3` |
| `fields[].auto_fill` | 是否自动带出（头部字段均为 true） | `true` |
| `fields[].read_only` | 是否只读/不可编辑 | `true` |
| `sections[].columns` | 仅 table 分区，定义表格列 | `[{ "title": "预算项目名称", "required": true }]` |

**生成规则（强制性）**：
164→- **字字对齐（核心要求）**：`sections[].title`、`fields[].title` 和 `header fields[].label` 的中文名称必须与 UI 截图中的文本**完全一致**。严禁进行同义词替换、概括或缩写。
165→- **全量扫描原则**：AI 必须扫描截图中的每一个视觉元素。常见的遗漏点包括：
    - 基本信息区中重复出现的「申请人」、「部门」等字段（即使头部已存在）。
    - 明细表中的「序号」、「操作」列。
    - 带有红色星号的每一个细小字段。
    - 多行文本框（Textarea）的占位符提示。
166→- **禁止脑补**：不要根据业务逻辑自动补全标题。如果截图上没有「进修」二字，JSON 中绝对不能出现。
167→- **截图分析必须覆盖头部**：第一个 section 为 `"type": "header"`（标题「单据头部」），渲染为横排元数据行 `label: value | ...`，非表单栅格
- **头部默认规则**（除非产品文档有提及新规则）：单据编号(系统自动生成)、申请日期(默认当前日期)、申请人(自动带出登录用户)、所属部门(自动带出申请人部门)，组件类型均为文本显示，`auto: true`
- `sections` 和 `fields` 中的字段顺序必须与 UI 截图**从上到下、从左到右**严格一致
- 表格分区只需定义 `columns`，行数据由运行时动态生成
- **禁止猜测字段名**：Step 2 的 JSON 中**严禁**包含 `name` 属性。此阶段仅关注视觉呈现（标题、布局、必填），真实的字段名（prop 名）统一在 Step 3 接口取数阶段通过中文标题智能比对产生。
- 组件类型描述使用中文通用名（如 `下拉选择`、`日期选择`、`文本输入`、`金额输入`），不写具体 Formily 组件名

#### Step 2b：生成 HTML 可视化

```bash
python3 .agents/skills/form-template-sop/scripts/generate-html-from-analysis.py \
  --input <分析结果.json> \
  --output <输出.html> \
  --screenshot <截图相对路径>
```

**HTML 包含内容**：
- 界面截图
- 线框图还原（按 grid 列数和 gridSpan 分行渲染，与截图布局对应）
- 字段汇总表（序号、字段名、中文标题、组件类型、必填、联动规则）
- 联动规则列表
- 风险项列表
- PC/移动端差异（如有）

#### ⚠️ 用户确认（Step 2 卡点）

**生成 HTML 后，必须停下来等待用户确认分析结果。** 重点核对：

- [ ] 字段名称与 UI 截图完全一致
- [ ] 字段顺序（行/列）与 UI 截图完全一致
- [ ] 栅格列数（grid）与截图中每行字段数匹配
- [ ] 必填标识（红色星号）与截图一致
- [ ] 组件类型判断正确（下拉 vs 文本输入 vs 日期选择）
- [ ] 联动关系描述准确
- [ ] 风险项已识别

用户明确指出「确认通过」或「没问题」后，方可进入 Step 3。如有修改意见，调整 JSON 后重新生成 HTML，再次确认。

### Step 3：接口取数 + 数据富化 + 生成确认文档

**前置条件**：Step 2 分析结果已通过用户确认。

#### 🚫 强制规则（必须遵守）

1. **必须用目标医院的账号登录**：根据 Step 2 `task_info.hospital` 查 `config/accounts.json`，严禁使用其他医院账号。
2. **必须查目标医院的单据**：使用模糊搜索定位目标医院系统中真实的 `certCode`。
3. **智能比对与推测逻辑**：
    - **三重比对**：通过 Title (中文名)、Name (代码) 以及 Fuzzy Match 三重算法关联字段。
    - **同医院推测（新增）**：若 API 找不到定义，脚本会自动扫描目标医院目录下所有单据的 `form.json`，根据中文标题推测 `name` 和 `dictCode`。
    - **跨院参考**：若以上均失败，则从 `--ref-keyword` 指定的参考单据中补全。
4. **自动校验字典**：脚本应自动对 UI 上所有选择类组件执行字典存在性校验。

#### 执行流程

```bash
# 1. 运行数据富化脚本（自动登录、搜索单据、比对字段、校验字典）
# 如果产品文档提到了参考单据，使用 --ref-keyword 指定
# 推荐同时指定 --ref-path 指向本地 codebase 路径以获得更精确的配置补全
node .agents/skills/form-template-sop/scripts/step3-enrich-data.mjs \
  --task-dir tasks/<任务名> \
  --hospital "<目标医院>" \
  --keyword "<目标单据关键字>" \
  --ref-hospital "华西" \
  --ref-keyword "国内进修报销" \
  --ref-path "华西医院/报销单据/国内进修报销单_refresherTrainingReimburseForm"

# 2. 运行文档生成脚本
python3 .agents/skills/form-template-sop/scripts/step3-generate-confirmation.py \
  --enriched tasks/<任务名>/分析结果/enriched-combined.json \
  --output tasks/<任务名>/确认文档/<Jira编号>-确认文档.md
```

#### 🆕 参考单据自动补全规则
当某些 UI 字段在**目标医院**系统中找不到对应 API 定义时，AI 应通过 `--ref-keyword` 指定的参考单据进行补全：
1. **字段名匹配**：从参考单据中寻找同标题字段，提取其 `name`。
2. **组件补全**：提取参考单据的 `pc_component` 和 `mobile_component`。
3. **来源标注**：在输出 JSON 的 `_source` 字段中标注为 `参考[参考单据名]`。

**产出**：
- `enriched-combined.json`：整合了接口定义、字典校验、UI 布局的终极元数据。
- `确认文档.md`：供人工 Review 的最终报告。

**MCP Server**：`form-template-sop-mcp`（位于 `mcp/` 目录）

| Tool | 功能 | 输入 | 输出 |
|------|------|------|------|
| `login_to_hospital` | 登录系统获取 token | `hospitalName` | token, baseUrl, hospitalCode |
| `get_certificate_fields` | 获取凭证字段定义 | `certCode` | 字段名、类型、必填、字典编码 |
| `get_dictionary` | 根据字段名搜索字典 | `fieldName`（中文） | dictName、code、leaves[] |
| `get_form_config` | 获取表单配置 | `certCode` | fieldMapping、联动规则 |
| `get_behavior_model` | 获取行为模型 | `certCode` | 状态流转、审批节点 |

**账号选择**：AI 根据医院名从 `config/accounts.json` 决策使用哪个账号登录。

**确认文档生成命令**：

```bash
python3 .agents/skills/form-template-sop/scripts/step3-generate-confirmation.py \
  --enriched tasks/<任务名>/分析结果/enriched-combined.json \
  --output tasks/<任务名>/确认文档/<Jira编号>-确认文档.md
```

**确认文档结构**（必含章节）：

```
一、任务元信息     — 医院、单据、参考单据
二、接口取数结果   — 登录状态、凭证查找结果、字典查询统计
三、字段清单       — 基本信息区（PC+移动端双列组件）
四、字段清单       — 表格子表（费用明细、预算项目等）
五、模板组件引用   — 可复用的 $ref 模板组件及路径
六、字典校验       — 每个字段的字典编码、枚举值、状态
七、联动关系
八、风险项         — ❌阻塞 / ⚠️高风险 / ℹ️低风险
九、PC vs 移动端差异
Review 确认
```

**确认文档规则**：

1. **组件必须区分 PC 和 Mobile**：字段清单同时列出 PC 组件和移动端组件两列，PC 用 `Tax*`/`Dt*` 系列，移动端用 `Rs*`/`DtFNut*` 系列
2. **优先使用模板组件**：搜索项目中已有模板组件（`模板组件/` 目录），如有匹配则引用文件路径，避免内联重写。常用模板：`TaxBaseProjectInfo`(PC)/`RsProjectInfo`(Mobile) 预算项目
3. **字段来源标识**：每个字段标注来源 — 接口确认 / 截图推测 / 模板组件 / 待新建
4. **字典校验**：每个 isDict 字段标注编码、枚举值(lable:value)、状态(✅存在/⚠️未查到/❌需新建)
5. **风险分级**：阻塞(无法继续) > 高风险(字典缺失/字段无对应) > 低风险(命名差异)
6. **查不到即为风险**：凭证不存在、字典未查到、字段无对应 → 如实列为风险，不编造、不跨院查找

**用户确认（Step 3 卡点）**：生成确认文档后，**必须停止所有自动化配置工作，等待用户审查**。用户明确「确认通过」或「开始开发」后，方可进入 schema-creator 配置阶段。

**迭代机制**：在此阶段，如果用户提出修改意见，应首先**调整确认文档**并重新提交 Review，直到文档完全符合用户预期。严禁在文档未确认前直接修改 Schema 代码。

### Step 4：生成最终实施文档 (Implementation Spec)

**前置条件**：Step 3 确认文档已通过 Review。

**核心目标**：将 UI 分析（布局）、确认文档（字段映射）以及参考单据（隐藏逻辑/语法）深度整合，形成一份「机器可读且指令清晰」的实施规范。

**执行命令**：

```bash
python3 .agents/skills/form-template-sop/scripts/step4-generate-spec.py \
  --task-dir tasks/<任务名> \
  --output tasks/<任务名>/确认文档/实施文档-ImplementationSpec.md
```

**实施文档包含内容**：
1.  **完整字段表**：包含 prop 名、UI 标题、组件、必填、字典、数据来源。
2.  **隐藏字段清单**：从参考单据中自动提取的必要隐藏字段（如 `recId`, `status`, `accountYear` 等）。
3.  **布局指令**：精确的 grid 和 gridSpan 配置要求。
4.  **深度联动逻辑**：包含参考单据中的复杂表达式（如 `x-reactions` 中的 `run` 脚本、移动端 AMIS 语法）。
5.  **校验规则**：正则校验、范围校验等。

**配置阶段衔接**：
在切换到 `schema-creator` 技能后，**必须**首先将此「实施文档」作为上下文提供给 AI，并下达指令：「请严格按照实施文档中的字段定义、布局要求和联动逻辑进行 schema 配置」。

## 人工确认要点

### Step 2 确认（分析结果）

生成 HTML 线框图后，需用户确认分析结果，重点核对：

- [ ] 字段名称与 UI 截图完全一致
- [ ] 字段顺序与 UI 截图（行/列）完全一致
- [ ] 栅格列数与截图中每行字段数匹配
- [ ] 组件类型判断正确（下拉 vs 文本输入 vs 日期选择）
- [ ] 必填标识（红色星号）与截图一致
- [ ] 联动关系描述准确
- [ ] 表格分区的列定义正确

### Step 3 确认（确认文档）

确认文档生成后，需人工 Review，重点核对：

- [ ] **阻塞项**：无法登录/找不到单据等阻塞问题是否已解决
- [ ] **风险项**：所有识别出的风险是否已被评估或解决
- [ ] 字段名（name）与接口字段映射表对齐
- [ ] fieldMapping 完整且正确
- [ ] 字典编码在目标医院系统中真实存在
- [ ] 字典项 label/value 映射正确
- [ ] 组件类型推荐合理（参考目标单据或参考单据）
- [ ] 行为模型（审批流）与实际一致
- [ ] 特殊场景已覆盖（导入、批量选择等）

确认通过后，执行 Step 4 生成实施文档，随后进入 schema-creator 配置阶段。

## 设计参考

详细的设计动机和决策过程见 [DESIGN.md](DESIGN.md)，包含：
- 从实践问题到设计方案的推导
- 与传统配置方式的对比
- 各步骤的详细设计

## 依赖 Skill

| Skill | 用途 |
|-------|------|
| `jira-fetcher` | Step 0 要素收集，获取 Jira 任务信息 |

## 目录结构

```
.agents/skills/form-template-sop/
├── SKILL.md                    # 本文件 - 技能主入口
├── DESIGN.md                   # 设计文档（动机、对比、决策）
├── scripts/
345→│   ├── step1-init-task.py            # 初始化任务 + 同步原始资料
346→│   ├── step2-analyze-ui.py            # [参考] AI 输出格式参考
│   ├── generate-html-from-analysis.py # JSON → HTML 可视化
│   ├── step3-generate-confirmation.py # JSON → 确认文档 .md
│   └── analysis-result.json           # JSON 数据格式模板
├── mcp/
│   ├── server.js                      # MCP Server 主入口
│   ├── package.json
│   └── lib/
│       ├── login.js                   # 登录逻辑
│       └── certificate-api.js         # 凭证接口封装
├── config/
│   └── accounts.json                  # 医院登录账号
└── references/
    ├── SOP流程图.md
    └── 账号信息.md
```

## 环境要求

- Python 3.8+
- Node.js 18+（MCP Server）
- 依赖 `jira-fetcher` Skill 获取 Jira 信息
- MCP Server 启动：`cd mcp/ && npm install && npm start`
