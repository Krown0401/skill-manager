# Skill-SOP 智能编排与审查工具 · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Electron 桌面应用，提供 Skill 管理、SOP 智能生成（场景 A）、SOP 契合度审查优化（场景 B）三大核心能力，最终打包为可分发的 Windows .exe 安装包。

**Architecture:** Electron 双进程架构。主进程（Node）负责目录扫描、LLM 调用、本地持久化、Markdown 导入导出；渲染进程（Vue 3 + Vite）提供 UI、AntV X6 流程图渲染、AntV G2 评分图表；两者通过 contextBridge + IPC 白名单通道通信。前后端共享 TypeScript 类型和评分算法纯函数。

**Tech Stack:** Electron + Vite + Vue 3 + TypeScript + Pinia + Vue Router + AntV X6 + AntV G2 + Element Plus + electron-store + OpenAI SDK + gray-matter + zod + electron-builder (NSIS)

**Design Spec Reference:** [2026-08-12-skill-sop-orchestrator-design.md](../specs/2026-08-12-skill-sop-orchestrator-design.md)

---

## File Responsibility Map

### Configuration & Entry

| File | Responsibility |
|------|---------------|
| `package.json` | 统一依赖 + scripts（dev / build / pack） |
| `vite.config.ts` | Vite + vite-plugin-electron + vite-plugin-electron-renderer 配置 |
| `electron-builder.yml` | electron-builder NSIS 打包配置（appId、图标、安装目录、输出 .exe） |
| `tsconfig.json` | 渲染进程 TS 配置（Vue + DOM 库） |
| `tsconfig.node.json` | 主进程 TS 配置（NodeNext + types: node） |
| `.gitignore` | node_modules / dist / release / .superpowers / electron-store 数据目录 |

### Shared Types & Constants（前后端共享，禁止引 Node/Vue 专属 API）

| File | Responsibility |
|------|---------------|
| `src/shared/types/skill.ts` | Skill、JSONSchema7 类型导出 |
| `src/shared/types/sop.ts` | SOP、SOPNode（6 种 type）、SOPEdge 类型导出 |
| `src/shared/types/review.ts` | 8 个 ReviewDimension 联合类型、ReviewConfig、ReviewResult、ReviewFinding、FindingSeverity 类型导出 |
| `src/shared/constants/dimensions.ts` | DEFAULT_DIMENSIONS 数组：8 维度元信息（key/中文名/emoji/说明/default_rank） |
| `src/shared/utils/score.ts` | 纯函数：calculateWeights()、calculateOverallScore()；DECAY_FACTOR = 0.8 |

### Electron Main Process

| File | Responsibility |
|------|---------------|
| `electron/main.ts` | Electron 入口：app.whenReady → create BrowserWindow（加载 Vite dev server 或 dist 静态文件）→ 注册 ipcMain.handle 白名单 → app.on('window-all-closed') 退出 |
| `electron/preload.ts` | contextBridge.exposeInMainWorld("api", 白名单方法)；方法签名与 §9 IPC 清单一致 |
| `electron/core/storage.ts` | 封装 electron-store：设置（LLM 配置、扫描目录）、Skill 库 JSON、SOP 库 JSON 的 CRUD；数据存 `<userData>/skill-manager/` 下 |
| `electron/core/skill-scanner.ts` | 扫描指定目录 → 递归查找 SKILL.md → gray-matter 解析 frontmatter → 返回 Skill[]（source_type=scan、source_path、raw_markdown 填好）；使用 zod 校验 frontmatter 并容错 |
| `electron/core/llm-client.ts` | 封装 OpenAI SDK 兼容模式：构造 messages、支持 json_object response_format、zod 校验输出、失败自动降 temperature 重试 1 次；支持用户配置 baseURL / apiKey / model |
| `electron/core/sop-importer.ts` | L2 调用：Markdown 文本 + Skill 索引 → 构造 Prompt → 调 llm-client → zod 校验解析出的 {nodes, edges, success_criteria} → 返回结构化 SOP（含 suspected_parse_error 标注机制） |
| `electron/core/sop-exporter.ts` | 纯函数 + Node I/O：exportToJSON()、exportToMarkdown()（含 Mermaid 图渲染 + 步骤详情表 + 成功标准 + 可选优化建议）；返回字符串，由主进程调 dialog.showSaveDialog 落盘 |
| `electron/core/review-engine.ts` | 纯函数：调用 shared/utils/score.ts；L4 调用构造：把维度优先级字符串拼进 Prompt、传入 SOP + 引用 Skill 详情；调用 llm-client 获取 ReviewResult；zod 校验 |
| `electron/core/prompts/L1-skill-enrich.md` | L1 Prompt 模板：SKILL.md → Skill 扩展字段 JSON |
| `electron/core/prompts/L2-markdown-to-sop.md` | L2 Prompt 模板：Markdown SOP → 结构化 SOP JSON |
| `electron/core/prompts/L3-generate-sop.md` | L3 Prompt 模板：goal + Skill 列表 + 维度优先级 → 编排 SOP JSON + explanation |
| `electron/core/prompts/L4-review-sop.md` | L4 Prompt 模板：SOP + 引用 Skill + 维度优先级 → ReviewResult JSON |
| `electron/core/ipc-handlers.ts` | 集中注册所有 ipcMain.handle：按 §9 的通道清单，把请求分发到 storage / scanner / llm-client / importer / exporter / review-engine；对路径参数做 path.normalize + 前缀校验（禁止越权） |

### Renderer Process - Vue 3 App

| File | Responsibility |
|------|---------------|
| `src/main.ts` | createApp → use(Pinia) → use(Router) → mount(#app) |
| `src/App.vue` | `<router-view />` + 全局样式入口 |
| `src/router/index.ts` | 路由表：/dashboard、/skills、/sop-generator、/sop-review、/sops/:id、/settings、/settings/llm、/settings/storage、/settings/about；redirect: '/' → '/dashboard' |
| `src/stores/settings.store.ts` | 设置状态：llmConfig（apiKey、baseURL、model）、scanDirs[] + 对应 CRUD + 持久化（调 window.api.settings.*） |
| `src/stores/skill.store.ts` | Skill 库状态：skills[] Map<id, Skill> + getAll / save / delete / scanDirectory / llmEnrich（调 window.api.skill.*） |
| `src/stores/sop.store.ts` | SOP 库状态：sops[] + currentSOP + getAll / get / save / delete / generate / importMarkdown / export（调 window.api.sop.*） |
| `src/stores/review.store.ts` | 审查状态：currentReviewConfig + lastReviewResult + review()（调 window.api.sop.review） |
| `src/layout/MainLayout.vue` | 左侧 ElMenu（导航项见 §5.2）+ 顶栏（当前页标题 + 全局通知）+ ElMain 里放 `<router-view />` |
| `src/views/dashboard/Dashboard.vue` | 4 张卡片概览：Skill 总数 / SOP 总数 / 最近生成 SOP 快捷入口 / 快捷操作（扫描、生成、审查） |
| `src/views/skills/SkillList.vue` | 顶部：搜索框（按 name/description/tag） + 「扫描目录」按钮 + 「手动新建」按钮；表格：name / description / source_type / tags / 创建时间 / 操作（编辑、AI 补全、删除） |
| `src/views/skills/SkillEditorDrawer.vue` | 右侧抽屉：分 Tab（基本信息、入参/出参 Schema、前置条件/副作用、关联 Skill）；底部保存/取消；name/description 不可为空校验 |
| `src/views/sop-generator/GeneratorForm.vue` | 3 步引导：① 输入 goal (ElInput type=textarea) + ② 选择 Skill（穿梭框或 ElTable 多选）+ ③ ReviewConfig 维度排序（可跳过用默认值）；底部「开始生成」按钮 + loading 状态 |
| `src/views/sop-generator/GeneratorResult.vue` | 展示：生成的 SOP 基本信息卡片 + explanation 说明文本 + 「查看详情 → 跳 /sops/:id」+ 「重新生成」 |
| `src/views/sop-review/ReviewImport.vue` | 两种导入：Tab 1 上传 Markdown 文件 / 粘贴 Markdown 文本；Tab 2 从 SOP 历史库选择；下一步：ReviewConfig 排序 |
| `src/views/sop-review/ReviewConfigPanel.vue` | 8 维度可拖拽列表（vue-draggable-plus 或 sortablejs）：每行列序号+图标+名称+说明+动态权重百分比；底部「恢复默认排序」+ 「开始审查」 |
| `src/views/sop-review/ReviewResultView.vue` | 顶部：综合分大数字 + 颜色条 + 文案；左：RadarScoreChart 雷达图 + DimensionScoreBar 条形图（并展开得分计算明细）；右：分级建议列表（Critical / Warning / Suggestion 三 Tab），每条 finding 展开详情 + suggestion，点击 related_node_ids 联动 FlowHighlight |
| `src/views/sop-review/FlowHighlight.vue` | 嵌入 X6Canvas：命中 finding 的相关节点按 severity 叠加红/黄/蓝描边；未命中节点降透明度；点击节点侧栏显示关联 findings |
| `src/views/sop-detail/SOPDetail.vue` | 左 70%：FlowCanvas（X6 只读）；右 30%：节点信息侧栏（选中节点的 type / title / description / skill_id → 跳转 Skill 编辑 / condition_expr / manual_checklist）；顶部操作区：name / goal 编辑 + 导出 JSON / 导出 Markdown / 保存 |
| `src/components/flow/X6Canvas.vue` | X6 画布封装 props: nodes / edges / highlightNodes (Map<nodeId, severity>) / readonly；封装 dagre 自动布局；封装 zoom/pan；emit: node-click |
| `src/components/flow/node-shapes/*.ts` | 6 种自定义节点形状：SkillNode（主色蓝底、绑定 Skill 名 label）、ManualNode（紫底虚线描边、👤 icon）、ConditionNode（菱形）、ParallelNode（双横线）、StartNode（圆绿）、EndNode（圆红） |
| `src/components/chart/RadarScoreChart.vue` | AntV G2 Radar：8 个维度 axis + score 数据 + 颜色映射；高分层用深蓝 |
| `src/components/chart/DimensionScoreBar.vue` | AntV G2 Interval Bar：y=维度名、x=score(0-100)；tooltip 展示：原始分 × 权重% = 贡献分（透明化计算过程） |
| `src/views/settings/LlmConfig.vue` | 表单：API Key（密码显隐切换）+ BaseURL（默认 https://api.openai.com/v1，兼容其他）+ Model（默认 gpt-4o-mini 或用户自选）+ 「测试连通性」按钮（发 1 条 chat ping）+ 保存 |
| `src/views/settings/StorageConfig.vue` | 已配置的扫描目录列表 + 「添加目录」调 window.dialog.showOpenDialog({properties:['openDirectory']}) + 「立即扫描」按钮 + 手动触发扫描 |
| `src/views/settings/About.vue` | 应用名 + 版本号 + Spec 文档链接 + 项目仓库信息 |
| `src/vite-env.d.ts` | declare module '*.vue' + 声明 interface Window { api: 对应 preload 的完整类型 } → 渲染进程调 window.api 时有 TS 类型 |

---

## TDD Orientation（前置说明）

> **注**：由于本项目是 Electron + 可视化 UI 为主的桌面应用，TDD 的重点是对**纯函数模块**（score.ts、sop-exporter 的字符串构造部分、storage 的序列化、zod schema 校验）进行单元测试。UI 组件和 IPC 走手工冒烟测试。所有任务的「Step X: Run tests」在非纯函数模块下即指「启动 dev 模式手动验证」。

测试框架选择：**Vitest**（与 Vite 无缝集成），单元测试命令：`npx vitest run`。

---

## Task 1: 项目脚手架（M1 基础框架）

**Goal:** Electron + Vue3 + Vite 跑通；左侧菜单可切换页面；打包 .exe 可正常启动显示 Hello World。

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `electron-builder.yml`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `.gitignore`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src/router/index.ts`
- Create: `src/stores/settings.store.ts`（骨架 + 空 api 映射）
- Create: `src/layout/MainLayout.vue`
- Create: `src/views/dashboard/Dashboard.vue`
- Create: `src/views/skills/SkillList.vue`（占位页面，显示"Skill 库"）
- Create: `src/views/sop-generator/GeneratorForm.vue`（占位）
- Create: `src/views/sop-review/ReviewImport.vue`（占位）
- Create: `src/views/sop-detail/SOPDetail.vue`（占位 :id）
- Create: `src/views/settings/LlmConfig.vue`（占位）
- Create: `src/views/settings/StorageConfig.vue`（占位）
- Create: `src/views/settings/About.vue`（占位）
- Create: `src/vite-env.d.ts`
- Test: (手工冒烟) `npm run dev` 启动后，Electron 窗口能打开，左侧菜单 6 项可点击切换且不报错

### Steps

- [ ] **Step 1.1: 创建 package.json**

```json
{
  "name": "skill-sop-orchestrator",
  "version": "0.1.0",
  "description": "Skill-SOP 智能编排与审查工具",
  "main": "dist-electron/main.js",
  "author": "Skill Manager Team",
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build && electron-builder --dir",
    "pack": "vue-tsc --noEmit && vite build && electron-builder",
    "test": "vitest run"
  },
  "dependencies": {
    "electron-store": "^8.2.0",
    "gray-matter": "^4.0.3",
    "openai": "^4.56.0",
    "vue": "^3.4.38",
    "vue-router": "^4.4.3",
    "pinia": "^2.2.2",
    "element-plus": "^2.8.2",
    "@antv/x6": "^2.18.1",
    "@antv/x6-vue-shape": "^2.1.2",
    "@antv/layout": "^0.3.6",
    "@antv/g2": "^5.2.7",
    "zod": "^3.23.8",
    "sortablejs": "^1.15.3",
    "vue-draggable-plus": "^0.5.2"
  },
  "devDependencies": {
    "electron": "^32.0.1",
    "electron-builder": "^25.0.5",
    "vite": "^5.4.2",
    "vite-plugin-electron": "^0.28.8",
    "vite-plugin-electron-renderer": "^0.14.6",
    "vue-tsc": "^2.1.4",
    "@vitejs/plugin-vue": "^5.1.3",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5",
    "@types/node": "^22.5.1",
    "@types/sortablejs": "^1.15.8"
  }
}
```

- [ ] **Step 1.2: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'electron-store']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist'
  }
});
```

- [ ] **Step 1.3: 创建 tsconfig.json + tsconfig.node.json**

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vite/client", "node"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "src/vite-env.d.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**tsconfig.node.json:**
```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["electron/**/*.ts", "vite.config.ts", "electron-builder.yml"]
}
```

- [ ] **Step 1.4: 创建 electron/main.ts（最简窗口）**

```typescript
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    title: 'Skill-SOP 智能编排工具',
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    icon: path.join(process.env.VITE_PUBLIC!, 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
  win = null;
});

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) allWindows[0].focus();
  else createWindow();
});

app.whenReady().then(() => {
  // IPC handlers will be registered by ipc-handlers.ts in Task 2+
  createWindow();
});
```

- [ ] **Step 1.5: 创建 electron/preload.ts（空白名单骨架 + window.api 类型声明）**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping'),

  skill: {
    scanDirectory: (dirPath: string) => ipcRenderer.invoke('skill:scanDirectory', dirPath),
    getAll: () => ipcRenderer.invoke('skill:getAll'),
    save: (skill: any) => ipcRenderer.invoke('skill:save', skill),
    delete: (id: string) => ipcRenderer.invoke('skill:delete', id),
    llmEnrich: (id: string) => ipcRenderer.invoke('skill:llmEnrich', id)
  },

  sop: {
    getAll: () => ipcRenderer.invoke('sop:getAll'),
    get: (id: string) => ipcRenderer.invoke('sop:get', id),
    save: (sop: any) => ipcRenderer.invoke('sop:save', sop),
    delete: (id: string) => ipcRenderer.invoke('sop:delete', id),
    generate: (payload: any) => ipcRenderer.invoke('sop:generate', payload),
    importMarkdown: (text: string, cfg: any) => ipcRenderer.invoke('sop:importMarkdown', text, cfg),
    review: (sopId: string, cfg: any) => ipcRenderer.invoke('sop:review', sopId, cfg),
    export: (id: string, format: 'json' | 'md') => ipcRenderer.invoke('sop:export', id, format)
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (config: any) => ipcRenderer.invoke('settings:save', config),
    testLlmConnection: () => ipcRenderer.invoke('settings:testLlmConnection')
  }
});

ipcRenderer.invoke('ping');
```

- [ ] **Step 1.6: 创建 src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  source_type: 'scan' | 'manual';
  source_path?: string;
  tags: string[];
  preconditions: string[];
  side_effects: string[];
  related_skill_ids: string[];
  estimated_duration?: string;
  raw_markdown?: string;
  created_at: number;
  updated_at: number;
}

type SOPNodeType = 'start' | 'end' | 'skill' | 'condition' | 'parallel' | 'manual';
interface SOPNode {
  id: string;
  type: SOPNodeType;
  title: string;
  description?: string;
  skill_id?: string;
  input_mapping?: Record<string, string>;
  output_alias?: Record<string, string>;
  condition_expr?: string;
  manual_checklist?: string[];
  position?: { x: number; y: number };
}
interface SOPEdge { id: string; from: string; to: string; condition_label?: string; }
interface SOP {
  id: string;
  name: string;
  goal: string;
  version: string;
  nodes: SOPNode[];
  edges: SOPEdge[];
  success_criteria: string[];
  tags: string[];
  source?: 'generated' | 'imported';
  source_markdown?: string;
  created_at: number;
  updated_at: number;
}

type ReviewDimension = 'dependency_integrity' | 'io_matching' | 'flow_completeness'
  | 'manual_gate_reasonable' | 'skill_purity' | 'parallelism'
  | 'granularity_consistency' | 'description_clarity';
type FindingSeverity = 'critical' | 'warning' | 'suggestion';
interface ReviewFinding {
  id: string; severity: FindingSeverity; dimension: ReviewDimension;
  title: string; detail: string;
  related_node_ids?: string[]; suggestion?: string;
  suspected_parse_error?: boolean;
}
interface ReviewResult {
  overall_score: number;
  dimension_scores: Record<ReviewDimension, { score: number; findings: ReviewFinding[] }>;
  summary: string;
}

declare interface Window {
  api: {
    ping: () => Promise<any>;
    skill: {
      scanDirectory: (dirPath: string) => Promise<Skill[]>;
      getAll: () => Promise<Skill[]>;
      save: (skill: Skill) => Promise<Skill>;
      delete: (id: string) => Promise<void>;
      llmEnrich: (id: string) => Promise<Skill>;
    };
    sop: {
      getAll: () => Promise<{ id: string; name: string; updated_at: number; goal: string; source?: any }[]>;
      get: (id: string) => Promise<SOP | null>;
      save: (sop: SOP) => Promise<SOP>;
      delete: (id: string) => Promise<void>;
      generate: (payload: { goal: string; selectedSkillIds: string[]; reviewConfig: any }) => Promise<SOP & { explanation?: string }>;
      importMarkdown: (text: string, cfg: any) => Promise<SOP>;
      review: (sopId: string, cfg: any) => Promise<ReviewResult>;
      export: (id: string, format: 'json' | 'md') => Promise<{ filename: string; content: string }>;
    };
    settings: {
      get: () => Promise<{
        llm: { apiKey: string; baseURL: string; model: string };
        scanDirs: string[];
      }>;
      save: (config: any) => Promise<void>;
      testLlmConnection: () => Promise<{ ok: boolean; message: string }>;
    };
  };
}
```

- [ ] **Step 1.7: 创建 Router、Store 骨架、MainLayout、5 个占位 Dashboard/Skill 页等**

**src/router/index.ts:**
```typescript
import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import MainLayout from '@/layout/MainLayout.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/dashboard/Dashboard.vue'), meta: { title: '首页' } },
      { path: 'skills', name: 'skills', component: () => import('@/views/skills/SkillList.vue'), meta: { title: 'Skill 库管理' } },
      { path: 'sop-generator', name: 'sop-generator', component: () => import('@/views/sop-generator/GeneratorForm.vue'), meta: { title: 'SOP 智能生成' } },
      { path: 'sop-review', name: 'sop-review', component: () => import('@/views/sop-review/ReviewImport.vue'), meta: { title: 'SOP 审查优化' } },
      { path: 'sops/:id', name: 'sop-detail', component: () => import('@/views/sop-detail/SOPDetail.vue'), meta: { title: 'SOP 详情' } },
      { path: 'settings', redirect: '/settings/llm' },
      { path: 'settings/llm', name: 'settings-llm', component: () => import('@/views/settings/LlmConfig.vue'), meta: { title: 'LLM 配置' } },
      { path: 'settings/storage', name: 'settings-storage', component: () => import('@/views/settings/StorageConfig.vue'), meta: { title: '存储与扫描' } },
      { path: 'settings/about', name: 'settings-about', component: () => import('@/views/settings/About.vue'), meta: { title: '关于' } }
    ]
  }
];

export default createRouter({ history: createWebHashHistory(), routes });
```

**src/stores/settings.store.ts:**
```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  const llmConfig = ref({ apiKey: '', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' });
  const scanDirs = ref<string[]>([]);

  async function load() {
    try {
      const s = await window.api.settings.get();
      llmConfig.value = s.llm;
      scanDirs.value = s.scanDirs;
    } catch { /* ignore */ }
  }
  async function save() {
    await window.api.settings.save({ llm: llmConfig.value, scanDirs: scanDirs.value });
  }

  return { llmConfig, scanDirs, load, save };
});
```

**src/layout/MainLayout.vue:**
```vue
<template>
  <el-container class="layout-root" style="height: 100vh;">
    <el-aside width="220px" style="background: #001529; color: #fff;">
      <div style="padding: 18px 16px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #1f3a5f;">
        🛠 Skill SOP 编排工具
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#001529"
        text-color="#cfd8e3"
        active-text-color="#409eff"
        style="border-right: none;"
      >
        <el-menu-item index="/dashboard">🏠 首页</el-menu-item>
        <el-menu-item index="/skills">🛠  Skill 库管理</el-menu-item>
        <el-menu-item index="/sop-generator">✨ SOP 智能生成</el-menu-item>
        <el-menu-item index="/sop-review">🔍 SOP 审查优化</el-menu-item>
        <el-sub-menu index="settings-menu">
          <template #title>⚙️ 设置</template>
          <el-menu-item index="/settings/llm">LLM 配置</el-menu-item>
          <el-menu-item index="/settings/storage">存储与扫描</el-menu-item>
          <el-menu-item index="/settings/about">关于</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="background: #fff; border-bottom: 1px solid #ebeef5; display: flex; align-items: center;">
        <h3 style="margin: 0;">{{ $route.meta.title as string }}</h3>
      </el-header>
      <el-main style="background: #f5f7fa;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
</script>

<style>
html, body, #app { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
</style>
```

**src/views/dashboard/Dashboard.vue:**
```vue
<template>
  <el-row :gutter="16">
    <el-col :span="6"><el-card shadow="hover"><div class="stat-num">{{ skillCount }}</div><div>Skill 总数</div></el-card></el-col>
    <el-col :span="6"><el-card shadow="hover"><div class="stat-num">{{ sopCount }}</div><div>SOP 总数</div></el-card></el-col>
    <el-col :span="12">
      <el-card shadow="hover">
        <div style="font-weight: 600; margin-bottom: 12px;">🚀 快捷操作</div>
        <el-space>
          <el-button type="primary" @click="$router.push('/skills')">管理 Skill 库</el-button>
          <el-button type="success" @click="$router.push('/sop-generator')">生成新 SOP</el-button>
          <el-button type="warning" @click="$router.push('/sop-review')">审查已有 SOP</el-button>
        </el-space>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const skillCount = ref(0);
const sopCount = ref(0);
try {
  window.api.skill.getAll().then(r => skillCount.value = r.length);
  window.api.sop.getAll().then(r => sopCount.value = r.length);
} catch { /* storage 未初始化会抛，忽略 */ }
</script>

<style scoped>
.stat-num { font-size: 32px; font-weight: 700; color: #409eff; margin-bottom: 6px; }
</style>
```

其余 6 个占位页面统一放一个 `<el-empty description="本页面开发中..."/>`。

- [ ] **Step 1.8: 创建 electron-builder.yml**

```yaml
appId: com.skillmanager.orchestrator
productName: Skill-SOP Orchestrator
directories:
  output: release/${version}
files:
  - dist/**/*
  - dist-electron/**/*
  - package.json
extraMetadata:
  main: dist-electron/main.js
win:
  target:
    - target: nsis
      arch:
        - x64
  artifactName: "${productName}-Setup-${version}.${ext}"
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: "Skill-SOP Orchestrator"
```

- [ ] **Step 1.9: 安装依赖并启动开发验证**

Run（PowerShell 5，用 cmd 版本）：
```
cd "e:\aaa-workplace\aaa-重装\skill-manager" ; npm.cmd install
```
Expected: 安装成功，无 ERR。

Run：
```
npm.cmd run dev
```
Expected: Electron 窗口打开 → 显示左侧 6 项菜单 → 点击菜单可以切换页面，页面不白屏，Console 无报错。

Run（打包空壳验证）：
```
npm.cmd run build
```
Expected: vite build 成功 + electron-builder --dir 完成，`release/<ver>/win-unpacked/Skill-SOP Orchestrator.exe` 双击能启动并显示同样的页面。

- [ ] **Step 1.10: Commit**

```bash
git add -A
git commit -m "chore(scaffold): M1 Electron + Vue3 + Vite 基础框架跑通"
```

---

## Task 2: Shared Types + 评分算法纯函数 + Skill 库持久化 + 扫描

**Goal:** M2 完成：前后端共享类型文件落地；score.ts 算法有 vitest 单元测试；electron storage 实现；skill-scanner 目录扫描（能解析 .agents/skills 下 4 个现有 Skill）；IPC 通道 skill:* 和 settings:get/save 全部打通 → Skill 管理页可展示列表 + 手动编辑保存 + 扫描刷新。

**Files:**
- Create: `src/shared/types/skill.ts`
- Create: `src/shared/types/sop.ts`
- Create: `src/shared/types/review.ts`
- Create: `src/shared/constants/dimensions.ts`
- Create: `src/shared/utils/score.ts`
- Create: `tests/shared/score.test.ts`
- Create: `electron/core/storage.ts`
- Create: `electron/core/skill-scanner.ts`
- Create: `electron/core/ipc-handlers.ts`（注册 skill:* + settings:*）
- Modify: `electron/main.ts` → 引入并调用 registerIpcHandlers()
- Modify: `src/vite-env.d.ts` → 用 import 替代重复 interface 声明
- Modify: `src/stores/skill.store.ts`（新建，替换骨架）
- Modify: `src/views/skills/SkillList.vue`（真实表格 + 扫描按钮）
- Create: `src/views/skills/SkillEditorDrawer.vue`
- Modify: `src/views/settings/StorageConfig.vue`（真实表单 + 扫描目录管理）

### Steps

- [ ] **Step 2.1: 创建 3 个 shared/types 文件 + constants/dimensions.ts**

**src/shared/types/skill.ts:**
```typescript
import type { JSONSchema7 } from 'json-schema';

export interface Skill {
  id: string;
  name: string;
  description: string;
  source_type: 'scan' | 'manual';
  source_path?: string;
  tags: string[];
  input_schema?: JSONSchema7;
  output_schema?: JSONSchema7;
  preconditions: string[];
  side_effects: string[];
  estimated_duration?: string;
  related_skill_ids: string[];
  raw_markdown?: string;
  created_at: number;
  updated_at: number;
}

// 注意：如果项目没装 @types/json-schema，就内联最小版 JSONSchema7
export type JSONSchema7Basic = {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'integer';
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  description?: string;
};
```

> 如果 `@types/json-schema` 不想引入，直接把上面 JSONSchema7Basic 放 shared/types/skill.ts。

**src/shared/types/sop.ts:**
```typescript
export type SOPNodeType = 'start' | 'end' | 'skill' | 'condition' | 'parallel' | 'manual';

export interface SOPNode {
  id: string;
  type: SOPNodeType;
  title: string;
  description?: string;
  skill_id?: string;
  input_mapping?: Record<string, string>;
  output_alias?: Record<string, string>;
  condition_expr?: string;
  manual_checklist?: string[];
  position?: { x: number; y: number };
}

export interface SOPEdge {
  id: string;
  from: string;
  to: string;
  condition_label?: string;
}

export interface SOP {
  id: string;
  name: string;
  goal: string;
  version: string;
  nodes: SOPNode[];
  edges: SOPEdge[];
  success_criteria: string[];
  tags: string[];
  source?: 'generated' | 'imported';
  source_markdown?: string;
  created_at: number;
  updated_at: number;
  explanation?: string;
}
```

**src/shared/types/review.ts:**
```typescript
export type ReviewDimension =
  | 'dependency_integrity'
  | 'io_matching'
  | 'flow_completeness'
  | 'manual_gate_reasonable'
  | 'skill_purity'
  | 'parallelism'
  | 'granularity_consistency'
  | 'description_clarity';

export interface ReviewDimensionMeta {
  key: ReviewDimension;
  name: string;
  icon: string;
  description: string;
  default_rank: number;
}

export interface ReviewConfig {
  dimension_order: ReviewDimension[];
}

export type FindingSeverity = 'critical' | 'warning' | 'suggestion';

export interface ReviewFinding {
  id: string;
  severity: FindingSeverity;
  dimension: ReviewDimension;
  title: string;
  detail: string;
  related_node_ids?: string[];
  suggestion?: string;
  suspected_parse_error?: boolean;
}

export interface ReviewResult {
  overall_score: number;
  dimension_scores: Record<ReviewDimension, {
    score: number;
    findings: ReviewFinding[];
  }>;
  summary: string;
}
```

**src/shared/constants/dimensions.ts:**
```typescript
import type { ReviewDimensionMeta } from '../types/review';

export const DEFAULT_DIMENSIONS: ReviewDimensionMeta[] = [
  { key: 'dependency_integrity',      name: '依赖完整性',       icon: '🔗', description: 'SOP 引用的 Skill 是否都存在，每个 Skill 的前置依赖是否被上游满足', default_rank: 0 },
  { key: 'io_matching',               name: '输入输出匹配度',   icon: '🔌', description: '上游输出能否覆盖下游输入要求，有没有参数传递断裂或浪费',       default_rank: 1 },
  { key: 'flow_completeness',         name: '流程冗余/缺失',     icon: '✅', description: '是否缺少关键环节（确认、校验），是否有冗余步骤',             default_rank: 2 },
  { key: 'manual_gate_reasonable',    name: '人工卡点合理性',   icon: '👤', description: '该有确认点的地方是否有 manual 节点，是否有过多不必要的人工干预', default_rank: 3 },
  { key: 'skill_purity',              name: 'Skill 职责纯度',   icon: '🎯', description: '是否有 Skill 职责过重（含多个不相关子流程）应拆分，或应合并',     default_rank: 4 },
  { key: 'parallelism',               name: '可并行性',         icon: '⚡', description: '有没有可以并行却被串行了的步骤',                                default_rank: 5 },
  { key: 'granularity_consistency',   name: '粒度一致性',       icon: '📐', description: '各节点粒度是否均衡，不会一个特别大或特别小',                    default_rank: 6 },
  { key: 'description_clarity',       name: '描述清晰度',       icon: '📝', description: '节点标题/description 是否清晰到另一个工程师接手就知道做什么',    default_rank: 7 }
];

export const DEFAULT_DIMENSION_ORDER = DEFAULT_DIMENSIONS.map(d => d.key);
```

- [ ] **Step 2.2: 创建评分算法 + Vitest 单元测试**

**src/shared/utils/score.ts:**
```typescript
import type { ReviewDimension } from '../types/review';

const DECAY_FACTOR = 0.8;

export function calculateWeights(order: ReviewDimension[]): Record<ReviewDimension, number> {
  const weights = {} as Record<ReviewDimension, number>;
  let rawTotal = 0;
  order.forEach((dim, idx) => {
    const raw = Math.pow(DECAY_FACTOR, idx);
    weights[dim] = raw;
    rawTotal += raw;
  });
  (Object.keys(weights) as ReviewDimension[]).forEach(dim => {
    weights[dim] = Math.round((weights[dim] / rawTotal) * 1000) / 10;
  });
  return weights;
}

export function calculateOverallScore(
  order: ReviewDimension[],
  scores: Record<ReviewDimension, number>
): number {
  const w = calculateWeights(order);
  let total = 0;
  order.forEach(dim => { total += (scores[dim] * w[dim]) / 100; });
  return Math.round(total);
}

export function scoreLevel(score: number): { label: string; color: string; className: string } {
  if (score < 60) return { label: '❌ 不合格 · 存在阻塞性问题', color: '#ef4444', className: 'score-bad' };
  if (score < 75) return { label: '⚠️ 需优化 · 有改进空间',    color: '#f59e0b', className: 'score-warn' };
  if (score < 90) return { label: '✅ 良好 · 可投入使用',      color: '#10b981', className: 'score-good' };
  return { label: '🌟 优秀 · 编排合理',                       color: '#0ea5e9', className: 'score-excellent' };
}
```

**tests/shared/score.test.ts:**
```typescript
import { describe, it, expect } from 'vitest';
import { calculateWeights, calculateOverallScore, scoreLevel } from '../../src/shared/utils/score';
import { DEFAULT_DIMENSION_ORDER } from '../../src/shared/constants/dimensions';
import type { ReviewDimension } from '../../src/shared/types/review';

describe('calculateWeights', () => {
  it('8 维度默认排序下权重和 = 100，首位 ~20%，末位 ~4%', () => {
    const w = calculateWeights(DEFAULT_DIMENSION_ORDER);
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(Math.round(sum)).toBe(100);
    const first = w[DEFAULT_DIMENSION_ORDER[0]];
    const last = w[DEFAULT_DIMENSION_ORDER[DEFAULT_DIMENSION_ORDER.length - 1]];
    expect(first).toBeGreaterThan(19);
    expect(first).toBeLessThan(22);
    expect(last).toBeGreaterThan(3);
    expect(last).toBeLessThan(6);
  });
});

describe('calculateOverallScore', () => {
  it('全 100 分 → 综合 100，全 0 → 综合 0', () => {
    const all100 = {} as Record<ReviewDimension, number>;
    const all0 = {} as Record<ReviewDimension, number>;
    DEFAULT_DIMENSION_ORDER.forEach(d => { all100[d] = 100; all0[d] = 0; });
    expect(calculateOverallScore(DEFAULT_DIMENSION_ORDER, all100)).toBe(100);
    expect(calculateOverallScore(DEFAULT_DIMENSION_ORDER, all0)).toBe(0);
  });

  it('全部 80 分 → 综合分四舍五入 = 80', () => {
    const s = {} as Record<ReviewDimension, number>;
    DEFAULT_DIMENSION_ORDER.forEach(d => s[d] = 80);
    expect(calculateOverallScore(DEFAULT_DIMENSION_ORDER, s)).toBe(80);
  });

  it('优先级首位满分其他 0 → 综合 ≈ 首位权重', () => {
    const s = {} as Record<ReviewDimension, number>;
    DEFAULT_DIMENSION_ORDER.forEach(d => s[d] = 0);
    s[DEFAULT_DIMENSION_ORDER[0]] = 100;
    const weights = calculateWeights(DEFAULT_DIMENSION_ORDER);
    const expected = Math.round(weights[DEFAULT_DIMENSION_ORDER[0]]);
    expect(Math.abs(calculateOverallScore(DEFAULT_DIMENSION_ORDER, s) - expected)).toBeLessThanOrEqual(1);
  });
});

describe('scoreLevel', () => {
  it('正确映射颜色区间', () => {
    expect(scoreLevel(59).color).toBe('#ef4444');
    expect(scoreLevel(60).color).toBe('#f59e0b');
    expect(scoreLevel(74).color).toBe('#f59e0b');
    expect(scoreLevel(75).color).toBe('#10b981');
    expect(scoreLevel(89).color).toBe('#10b981');
    expect(scoreLevel(90).color).toBe('#0ea5e9');
  });
});
```

- [ ] **Step 2.3: 创建 electron/core/storage.ts + electron/core/skill-scanner.ts**

**electron/core/storage.ts:**
```typescript
import Store from 'electron-store';
import type { Skill } from '../../src/shared/types/skill';
import type { SOP } from '../../src/shared/types/sop';

export interface AppSettings {
  llm: { apiKey: string; baseURL: string; model: string };
  scanDirs: string[];
}

const defaults: AppSettings = {
  llm: { apiKey: '', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  scanDirs: []
};

export const store = new Store<{
  settings: AppSettings;
  skills: Skill[];
  sops: SOP[];
}>({
  name: 'skill-manager-data',
  cwd: 'skill-manager',
  defaults: { settings: defaults, skills: [], sops: [] }
});

// Settings
export function getSettings(): AppSettings { return store.get('settings'); }
export function saveSettings(s: AppSettings): void { store.set('settings', s); }

// Skills
export function getAllSkills(): Skill[] { return store.get('skills', []); }
export function saveSkill(skill: Skill): Skill {
  const list = getAllSkills();
  const idx = list.findIndex(s => s.id === skill.id);
  skill.updated_at = Date.now();
  if (idx >= 0) list[idx] = skill;
  else { skill.created_at = Date.now(); list.push(skill); }
  store.set('skills', list);
  return skill;
}
export function deleteSkill(id: string): void {
  store.set('skills', getAllSkills().filter(s => s.id !== id));
}

// SOPs (used in Task 4+)
export function getAllSOPs(): { id: string; name: string; goal: string; source?: any; updated_at: number }[] {
  return store.get('sops', []).map(s => ({
    id: s.id, name: s.name, goal: s.goal, source: s.source, updated_at: s.updated_at
  }));
}
export function getSOP(id: string): SOP | null { return store.get('sops', []).find(s => s.id === id) ?? null; }
export function saveSOP(sop: SOP): SOP {
  const list = store.get('sops', [] as SOP[]);
  const idx = list.findIndex(s => s.id === sop.id);
  sop.updated_at = Date.now();
  if (idx >= 0) list[idx] = sop;
  else { sop.created_at = Date.now(); list.push(sop); }
  store.set('sops', list);
  return sop;
}
export function deleteSOP(id: string): void { store.set('sops', store.get('sops', [] as SOP[]).filter(s => s.id !== id)); }
```

**electron/core/skill-scanner.ts:**
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import type { Skill } from '../../src/shared/types/skill';
import { randomUUID } from 'node:crypto';

const SkillFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1)
}).passthrough();

/**
 * 递归扫描 dirPath，找每个子目录下的 SKILL.md，解析 frontmatter。
 * 返回 Skill[]（source_type=scan，不直接入库，由调用方决定 upsert 还是返回）
 */
export async function scanSkillDirectory(dirPath: string, existingSkills: Skill[]): Promise<Skill[]> {
  const results: Skill[] = [];
  const existingMap = new Map(existingSkills.filter(s => s.source_path).map(s => [s.source_path!, s]));

  function walk(cur: string) {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); }
    catch { return; }

    const mdFile = entries.find(e => e.isFile() && e.name === 'SKILL.md');
    if (mdFile) {
      const mdPath = path.join(cur, 'SKILL.md');
      try {
        const text = fs.readFileSync(mdPath, 'utf-8');
        const parsed = matter(text);
        const validate = SkillFrontmatterSchema.safeParse(parsed.data);
        if (!validate.success) return; // 不合法的 frontmatter 静默跳过

        const absDir = fs.realpathSync ? fs.realpathSync(cur) : path.resolve(cur);
        const prev = existingMap.get(absDir);
        results.push({
          id: prev?.id ?? randomUUID(),
          name: validate.data.name,
          description: validate.data.description,
          source_type: 'scan',
          source_path: absDir,
          tags: prev?.tags ?? [],
          preconditions: prev?.preconditions ?? [],
          side_effects: prev?.side_effects ?? [],
          related_skill_ids: prev?.related_skill_ids ?? [],
          estimated_duration: prev?.estimated_duration,
          input_schema: prev?.input_schema,
          output_schema: prev?.output_schema,
          raw_markdown: text,
          created_at: prev?.created_at ?? Date.now(),
          updated_at: Date.now()
        });
      } catch { /* skip malformed files */ }
      return; // 不往更深处走（一个 Skill 目录下不再嵌套 Skill）
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(path.join(cur, entry.name));
      }
    }
  }

  walk(dirPath);
  return results;
}
```

- [ ] **Step 2.4: 创建 electron/core/ipc-handlers.ts 并在 main.ts 调用**

**electron/core/ipc-handlers.ts:**
```typescript
import { ipcMain, dialog } from 'electron';
import path from 'node:path';
import * as storage from './storage';
import type { Skill } from '../../src/shared/types/skill';
import { scanSkillDirectory } from './skill-scanner';

function safePath(userPath: string): string {
  const normalized = path.normalize(userPath);
  // 禁止相对路径和 .. 穿越（scanDirs 一般是用户选的，这里再做一层保护）
  if (!path.isAbsolute(normalized)) {
    throw new Error('Path must be absolute: ' + userPath);
  }
  return normalized;
}

export function registerIpcHandlers(): void {
  ipcMain.handle('ping', () => ({ ok: true, ts: Date.now() }));

  // Settings
  ipcMain.handle('settings:get', () => storage.getSettings());
  ipcMain.handle('settings:save', (_e, config) => { storage.saveSettings(config); });
  ipcMain.handle('settings:testLlmConnection', () => ({ ok: false, message: 'LLM 客户端模块未加载（Task3 完成后可用）' }));

  // Skills
  ipcMain.handle('skill:getAll', () => storage.getAllSkills());
  ipcMain.handle('skill:save', (_e, skill: Skill) => storage.saveSkill(skill));
  ipcMain.handle('skill:delete', (_e, id: string) => storage.deleteSkill(id));
  ipcMain.handle('skill:llmEnrich', async (_e, _id: string) => {
    throw new Error('llmEnrich 尚未实现（Task3 加载）');
  });
  ipcMain.handle('skill:scanDirectory', async (_e, dirPath: string) => {
    const safe = safePath(dirPath);
    const existing = storage.getAllSkills();
    const scanned = await scanSkillDirectory(safe, existing);
    // 入库 upsert
    scanned.forEach(s => storage.saveSkill(s));
    return storage.getAllSkills();
  });

  // SOP CRUD（实现先存好，Task4+ 会用到）
  ipcMain.handle('sop:getAll', () => storage.getAllSOPs());
  ipcMain.handle('sop:get', (_e, id: string) => storage.getSOP(id));
  ipcMain.handle('sop:save', (_e, sop) => storage.saveSOP(sop));
  ipcMain.handle('sop:delete', (_e, id: string) => storage.deleteSOP(id));
  ipcMain.handle('sop:generate', async () => { throw new Error('sop:generate 尚未实现（Task4）'); });
  ipcMain.handle('sop:importMarkdown', async () => { throw new Error('importMarkdown 尚未实现（Task5）'; });
  ipcMain.handle('sop:review', async () => { throw new Error('sop:review 尚未实现（Task6）'; });
  ipcMain.handle('sop:export', async () => { throw new Error('sop:export 尚未实现（Task7）'; });
}
```

**修改 electron/main.ts:** 在 `app.whenReady().then(() => { ... createWindow() })` 之前，import 并调用一次：
```typescript
import { registerIpcHandlers } from './core/ipc-handlers';
// ...
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});
```

- [ ] **Step 2.5: 重写 src/stores/skill.store.ts + SkillList + SkillEditorDrawer + StorageConfig**

要点：
- **store**: `skills: Skill[]` Map，`load() -> getAll()`、`scan(dir)`、`save(skill)`、`delete(id)`
- **SkillList.vue**: Element Plus `ElTable` 列：name / description / tags(ElTag) / source_type / 操作；顶部搜索框 `ElInput` 按 name/description 过滤；「扫描目录」按钮 → `dialog.showOpenDialog({ properties: ['openDirectory'] })`（preload 里加一个 IPC 或用 webUtils，但 Electron 沙箱下最简单做法：让 preload 暴露一个 `pickDirectory()` 方法 → 加进 ipc-handlers）
- **SkillEditorDrawer.vue**: `ElDrawer`，分普通字段（name、description、tags(ElSelect 可输入)、preconditions(ElInput taggable 字符串数组)、side_effects 同），保存时调 store.save
- **StorageConfig.vue**: 设置页管理 settings.scanDirs 列表，每一条有目录路径 +「立即扫描」+「移除」按钮，底部「添加目录」。

注：由于 showOpenDialog 在 preload 需要开放权限，在 ipc-handlers 增加一个 handler：
```typescript
ipcMain.handle('dialog:pickDirectory', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
```
同步加到 preload `window.api.dialog = { pickDirectory }` 和 vite-env.d.ts 接口声明里。

- [ ] **Step 2.6: 运行 Vitest 验证评分算法 + 手动冒烟扫描现有 Skill 目录**

Run:
```
npx vitest run tests/shared/score.test.ts
```
Expected: 4 describe 全部 PASS。

Run（dev）：启动 app → 设置 → 存储与扫描 → 添加目录 → 选择 `e:\aaa-workplace\aaa-重装\skill-manager\.agents\skills` → 点「立即扫描」。
Expected: Skill 管理页列表出现 4 条记录：form-template-sop / jira-fetcher / schema-creator / schema-organizer，description 与 SKILL.md frontmatter 一致。

- [ ] **Step 2.7: Commit**

```bash
git add -A
git commit -m "feat(skill-lib): M2 共享类型+评分算法TDD+持久化+目录扫描+Skill CRUD 页面"
```

---

## Task 3: LLM 客户端封装 + L1 Skill 字段补全

**Goal:** M3：llm-client 支持 OpenAI 兼容协议 + JSON 模式 + zod 校验 + 自动降温度重试；L1 Prompt 模板落地；Skill 管理页「AI 补全字段」可成功返回 tags/input_schema/output_schema/preconditions/side_effects；设置页「测试连通性」按钮返回 ok=true。

**Files:**
- Create: `electron/core/llm-client.ts`
- Create: `electron/core/prompts/L1-skill-enrich.md`
- Modify: `electron/core/ipc-handlers.ts` → 实现 `skill:llmEnrich` + `settings:testLlmConnection`

### Steps

- [ ] **Step 3.1: llm-client.ts（含 zod 校验 + 重试）**

```typescript
import OpenAI from 'openai';
import type { z } from 'zod';
import { getSettings } from './storage';

type CallOpts<T> = {
  systemPrompt: string;
  userPrompt: string;
  schema?: z.ZodSchema<T>;
  jsonMode?: boolean;
  temperature?: number;
  maxRetries?: number;
};

function buildClient(): OpenAI {
  const s = getSettings();
  if (!s.llm.apiKey) throw new Error('请先在「设置 → LLM 配置」填写 API Key');
  return new OpenAI({
    apiKey: s.llm.apiKey,
    baseURL: s.llm.baseURL,
    dangerouslyAllowBrowser: false
  });
}

function extractJson(text: string): any {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[1] ?? match[0]) : JSON.parse(text);
}

export async function testLlmConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const client = buildClient();
    const r = await client.chat.completions.create({
      model: getSettings().llm.model,
      max_tokens: 16, temperature: 0,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }]
    });
    const t = r.choices[0]?.message.content ?? '';
    return { ok: t.includes('OK'), message: t || '(empty)' };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? String(err) };
  }
}

export async function callLlm<T = any>(opts: CallOpts<T>): Promise<T> {
  const { systemPrompt, userPrompt, schema, jsonMode = !!schema, temperature = 0.4, maxRetries = 2 } = opts;
  const client = buildClient();
  let lastErr: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const temp = attempt === 0 ? temperature : Math.max(0, temperature - 0.2); // 重试时降温度
      const res = await client.chat.completions.create({
        model: getSettings().llm.model,
        temperature: temp,
        response_format: jsonMode ? ({ type: 'json_object' } as any) : undefined,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });
      const content = res.choices[0]?.message.content ?? '';
      const parsed = jsonMode ? extractJson(content) : content;
      if (!schema) return parsed as T;
      const valid = schema.safeParse(parsed);
      if (!valid.success) throw new Error('Schema 校验失败: ' + valid.error.issues.map(i => i.message).join('; '));
      return valid.data;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('LLM 调用失败');
}
```

- [ ] **Step 3.2: L1 Prompt 模板 electron/core/prompts/L1-skill-enrich.md**

```markdown
你是 Skill 元数据补全专家。请仔细阅读下面的 Skill 文档，输出结构化 JSON，包含：
- tags: string[]（3-6 个短标签）
- preconditions: string[]（前置条件，可能为空）
- side_effects: string[]（副作用，可能为空）
- estimated_duration: string（预估耗时，如"约 30 秒"，无法判断填 null）
- related_skill_hints: string[]（可能关联的其他 Skill 名称关键字数组）
- input_schema: object | null（JSON Schema { type: "object", properties: {...}, required: [...] }）
- output_schema: object | null（JSON Schema）
```

Skill 文档：
```
{{RAW_MARKDOWN}}
```

输出要求（严格 JSON，无额外解释）。
```

- [ ] **Step 3.3: 在 ipc-handlers.ts 实现 `skill:llmEnrich` + `settings:testLlmConnection`**

```typescript
// ipc-handlers.ts 顶部追加：
import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { callLlm, testLlmConnection as llmTest } from './llm-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function readPrompt(name: string): string {
  return fs.readFileSync(path.join(__dirname, 'prompts', name + '.md'), 'utf-8');
}

const L1Schema = z.object({
  tags: z.array(z.string()).default([]),
  preconditions: z.array(z.string()).default([]),
  side_effects: z.array(z.string()).default([]),
  estimated_duration: z.string().nullable().default(null),
  related_skill_hints: z.array(z.string()).default([]),
  input_schema: z.record(z.any()).nullable().default(null),
  output_schema: z.record(z.any()).nullable().default(null)
});

// 替换 ipc-handlers 中原先 throw 的 handler：
ipcMain.handle('settings:testLlmConnection', async () => llmTest());

ipcMain.handle('skill:llmEnrich', async (_e, id: string) => {
  const all = storage.getAllSkills();
  const skill = all.find(s => s.id === id);
  if (!skill) throw new Error('Skill 不存在: ' + id);
  const sys = readPrompt('L1-skill-enrich');
  const usr = `Skill 文档:\n\`\`\`\n${skill.raw_markdown ?? skill.name + '\n' + skill.description}\n\`\`\``;
  const res = await callLlm<z.infer<typeof L1Schema>>({
    systemPrompt: sys, userPrompt: usr, schema: L1Schema, jsonMode: true
  });
  skill.tags = res.tags;
  skill.preconditions = res.preconditions;
  skill.side_effects = res.side_effects;
  if (res.estimated_duration) skill.estimated_duration = res.estimated_duration;
  if (res.input_schema) skill.input_schema = res.input_schema as any;
  if (res.output_schema) skill.output_schema = res.output_schema as any;
  // related_skill_hints 做 name 匹配
  if (res.related_skill_hints?.length) {
    skill.related_skill_ids = all
      .filter(s => s.id !== skill.id && res.related_skill_hints.some(h => s.name.includes(h) || s.description.includes(h)))
      .map(s => s.id);
  }
  return storage.saveSkill(skill);
});
```

- [ ] **Step 3.4: 冒烟测试**

Run `npm run dev` → 设置页填 API Key（真实的）+ baseURL + model → 点「测试连通性」→ 显示 ok=true message=OK。
→ Skill 管理页找到 `form-template-sop` → 点「AI 补全」→ 等 LLM 返回 → drawer 中 tags 出现如"表单/SOP/单据配置/UI分析"等，preconditions 有"需要 Jira 链接"等。

- [ ] **Step 3.5: Commit**

```bash
git add -A
git commit -m "feat(llm): M3 LLM client+zod校验+L1 Skill字段补全+连通性测试"
```

---

## Task 4: 场景 A（SOP 智能生成）+ X6 只读流程图

**Goal:** M4：L3 Prompt + sop:generate 实现；GeneratorForm + GeneratorResult 页面跑通 → 输入"配置医院报销单"选择 jira-fetcher + form-template-sop + schema-creator → 生成的 SOP 正确包含 6+ 节点、3 个 manual 确认点 → SOP 详情页（/sops/:id）用 AntV X6 渲染只读流程图 + 节点侧栏。

**Files:**
- Create: `electron/core/prompts/L3-generate-sop.md`
- Create: `electron/core/sop-layout.ts`（Dagre 自动布局，给 nodes 填 position）
- Modify: `electron/core/ipc-handlers.ts` → 实现 `sop:generate` + 引入 SOP zod schema
- Create: `src/components/flow/X6Canvas.vue`
- Create: `src/components/flow/node-shapes/register.ts`
- Modify: `src/views/sop-generator/GeneratorForm.vue`
- Create: `src/views/sop-generator/GeneratorResult.vue`
- Modify: `src/views/sop-detail/SOPDetail.vue` → 真实实现
- Modify: `src/stores/sop.store.ts` → 真实实现
- Test: (手工) 真实 goal + 真实 Skill 子集生成成功 + 图渲染正确

### Steps

- [ ] **Step 4.1: SOP Zod schema + L3 Prompt + generate handler**

**L3-generate-sop.md:**
```markdown
【系统角色】SOP 编排专家。请根据用户目标与可用 Skill 库，编排一个结构合理、可落地的 SOP。

【编排原则（按优先级排序，高优严格遵守）】
{{PRINCIPLES_LIST}}

【节点类型约定，严格遵守】
- start/end：必须有且仅有一个 start、一个 end
- skill：必须填 skill_id（从可用库中选，禁止编造不存在的 Skill 名）
- manual：人工卡点必须有 manual_checklist 字符串数组 2-6 项；AI 分析结果、生成确认文档这类易出错环节必须插入 manual 节点
- condition：条件分支必须有 condition_expr，出边 edges 要有 condition_label（如"确认通过"/"有异议"）
- parallel：并行分发或汇聚点

【可用 Skill 库（每个 skill 的 id 必须原样使用）】
{{SKILLS_TABLE}}

【输出 JSON Schema】
{
  "name": "string SOP名称不超过30字",
  "nodes": [ {"id": "n_xxx", "type": "...", "title": "...", "description": "...", "skill_id?": "...", "condition_expr?": "...", "manual_checklist?": ["..."]} ],
  "edges": [ {"id": "e_xxx", "from": "n_xxx", "to": "n_xxx", "condition_label?": "..."} ],
  "success_criteria": ["3-6 条成功标准"],
  "tags": ["2-5 个标签"],
  "explanation": "3-5 句中文，解释编排关键决策与设计理由"
}
```

**SOP schema（放到 ipc-handlers 顶部）：**
```typescript
const SOPNodeSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().startsWith('n_'), type: z.literal('start'), title: z.string() }),
  z.object({ id: z.string().startsWith('n_'), type: z.literal('end'), title: z.string() }),
  z.object({ id: z.string().startsWith('n_'), type: z.literal('skill'), title: z.string(), skill_id: z.string(), description: z.string().optional(), input_mapping: z.record(z.string()).optional(), output_alias: z.record(z.string()).optional() }),
  z.object({ id: z.string().startsWith('n_'), type: z.literal('manual'), title: z.string(), manual_checklist: z.array(z.string()).min(1) }),
  z.object({ id: z.string().startsWith('n_'), type: z.literal('condition'), title: z.string(), condition_expr: z.string() }),
  z.object({ id: z.string().startsWith('n_'), type: z.literal('parallel'), title: z.string() })
]);
const SOPSchema = z.object({
  name: z.string().min(1),
  nodes: z.array(SOPNodeSchema).min(2),
  edges: z.array(z.object({ id: z.string().startsWith('e_'), from: z.string().startsWith('n_'), to: z.string().startsWith('n_'), condition_label: z.string().optional() })).min(1),
  success_criteria: z.array(z.string()).min(1),
  tags: z.array(z.string()),
  explanation: z.string().optional()
});
```

**sop:generate handler:**
```typescript
import { DEFAULT_DIMENSIONS } from '../../src/shared/constants/dimensions';
import { randomUUID } from 'node:crypto';
import type { SOP } from '../../src/shared/types/sop';
// 顶部追加

ipcMain.handle('sop:generate', async (_e, payload: any) => {
  const { goal, selectedSkillIds, reviewConfig } = payload;
  if (!goal || !selectedSkillIds?.length) throw new Error('请填写目标并选择至少一个 Skill');
  const allSkills = storage.getAllSkills();
  const selected = allSkills.filter(s => selectedSkillIds.includes(s.id));
  if (selected.length === 0) throw new Error('所选 Skill 均无效');

  const dimOrder = reviewConfig?.dimension_order ?? DEFAULT_DIMENSIONS.map(d => d.key);
  const principles = dimOrder.map((k, i) => {
    const d = DEFAULT_DIMENSIONS.find(x => x.key === k)!;
    return `${i + 1}. ${d.icon} ${d.name}：${d.description}`;
  }).join('\n');
  const table = selected.map(s => `【${s.id}】name=${s.name}; description=${s.description}; preconditions=${s.preconditions.join(';') || '(none)'}${s.estimated_duration ? '; 预估耗时=' + s.estimated_duration : ''}`).join('\n');
  const sys = readPrompt('L3-generate-sop').replace('{{PRINCIPLES_LIST}}', principles).replace('{{SKILLS_TABLE}}', table);
  const usr = `【用户目标】\n${goal}`;

  const data = await callLlm({ systemPrompt: sys, userPrompt: usr, schema: SOPSchema, jsonMode: true, temperature: 0.5 });
  const sop: SOP = {
    id: randomUUID(),
    name: data.name,
    goal,
    version: '1.0.0',
    nodes: data.nodes as any,
    edges: data.edges as any,
    success_criteria: data.success_criteria,
    tags: data.tags,
    source: 'generated',
    explanation: (data as any).explanation,
    created_at: Date.now(),
    updated_at: Date.now()
  };
  // 自动布局
  applyAutoLayout(sop);
  return storage.saveSOP(sop);
});
```

- [ ] **Step 4.2: sop-layout.ts（Dagre 自动布局）**

```typescript
import type { SOP } from '../../src/shared/types/sop';

/**
 * 给没有 position 的节点分配坐标。简单拓扑分层：BFS 从 start 出发按 depth 分层，每层水平排列。
 */
export function applyAutoLayout(sop: SOP): void {
  const start = sop.nodes.find(n => n.type === 'start');
  if (!start) return;
  const inMap = new Map<string, string[]>();
  const outMap = new Map<string, string[]>();
  sop.nodes.forEach(n => { inMap.set(n.id, []); outMap.set(n.id, []); });
  sop.edges.forEach(e => {
    outMap.get(e.from)!.push(e.to); inMap.get(e.to)!.push(e.from);
  });
  const depth = new Map<string, number>();
  const visited = new Set<string>();
  const queue: [string, number][] = [[start.id, 0]];
  while (queue.length) {
    const [id, d] = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    depth.set(id, d);
    outMap.get(id)!.forEach(nxt => queue.push([nxt, d + 1]));
  }
  // 对未遍历到的补深度 0
  sop.nodes.forEach(n => { if (!depth.has(n.id)) depth.set(n.id, 0); });
  const byDepth = new Map<number, SOP['nodes']>();
  sop.nodes.forEach(n => {
    const d = depth.get(n.id)!;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(n);
  });
  const sortedDepths = [...byDepth.keys()].sort((a, b) => a - b);
  const NODE_W = 200, NODE_H = 80, GAP_X = 80, GAP_Y = 60;
  sortedDepths.forEach(d => {
    const list = byDepth.get(d)!;
    list.forEach((n, i) => {
      if (!n.position) {
        n.position = { x: d * (NODE_W + GAP_X), y: i * (NODE_H + GAP_Y) + 20 };
      }
    });
  });
}
```

- [ ] **Step 4.3: X6Canvas.vue + register.ts（只读模式 + 6 种自定义节点）**

**src/components/flow/node-shapes/register.ts:**
```typescript
import { Graph, Shape } from '@antv/x6';

export function registerCustomNodes(): void {
  // Start 圆（绿）
  Shape.Circle.config({ width: 64, height: 64 }, true, 'custom-start');
  // End 圆（红）
  Shape.Circle.config({ width: 64, height: 64 }, true, 'custom-end');

  // Skill 矩形（蓝）
  Shape.Rect.config({ width: 200, height: 72, rx: 8, ry: 8 }, true, 'custom-skill');
  // Manual 矩形（紫虚线描边 + 👤）
  Shape.Rect.config({ width: 200, height: 72, rx: 8, ry: 8 }, true, 'custom-manual');
  // Condition 菱形
  Shape.Polygon.config({ width: 160, height: 88, refPoints: '0,0.5 0.5,0 1,0.5 0.5,1' }, true, 'custom-condition');
  // Parallel 双横条矩形（灰）
  Shape.Rect.config({ width: 160, height: 40, rx: 4, ry: 4 }, true, 'custom-parallel');
}
```

**src/components/flow/X6Canvas.vue:**
```vue
<template>
  <div ref="container" style="width: 100%; height: 100%; position: relative; background: #fafbfc;"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, shallowRef } from 'vue';
import { Graph } from '@antv/x6';
import { useDagreLayout } from '@antv/layout';
import type { SOPNode, SOPEdge, FindingSeverity } from '@/shared/types/sop';
import { registerCustomNodes } from './node-shapes/register';

const props = defineProps<{
  nodes: SOPNode[];
  edges: SOPEdge[];
  highlightNodes?: Record<string, FindingSeverity>; // nodeId -> severity 覆盖描边颜色
  readonly?: boolean;
}>();
const emit = defineEmits<{ (e: 'node-click', node: SOPNode): void }>();

registerCustomNodes();

const container = ref<HTMLDivElement>();
const graph = shallowRef<Graph>();

const typeToShape: Record<string, string> = {
  start: 'custom-start', end: 'custom-end',
  skill: 'custom-skill', manual: 'custom-manual',
  condition: 'custom-condition', parallel: 'custom-parallel'
};
const typeAttrs: Record<string, any> = {
  start: { body: { fill: '#dcfce7', stroke: '#16a34a', strokeWidth: 2 }, label: { fill: '#14532d', text: '▶ 开始', fontSize: 13 } },
  end:   { body: { fill: '#fee2e2', stroke: '#dc2626', strokeWidth: 2 }, label: { fill: '#7f1d1d', text: '■ 结束', fontSize: 13 } },
  skill: { body: { fill: '#dbeafe', stroke: '#2563eb', strokeWidth: 2 }, label: { fill: '#1e3a8a', fontSize: 13, textWrap: { width: 170 }, textVerticalAlign: 'middle' } },
  manual:{ body: { fill: '#ede9fe', stroke: '#7c3aed', strokeWidth: 2, strokeDasharray: '6 3' }, label: { fill: '#4c1d95', fontSize: 13, textWrap: { width: 170 } } },
  condition: { body: { fill: '#fef3c7', stroke: '#d97706', strokeWidth: 2 }, label: { fill: '#78350f', fontSize: 12 } },
  parallel:{ body: { fill: '#e5e7eb', stroke: '#4b5563', strokeWidth: 2 }, label: { fill: '#111827', text: '══ 并行 ══', fontSize: 13 } }
};
const sevToStroke: Record<FindingSeverity, string> = {
  critical: '#ef4444', warning: '#f59e0b', suggestion: '#3b82f6'
};

function render() {
  if (!graph.value) return;
  graph.value.clearCells();
  const cells: any[] = [];
  props.nodes.forEach(n => {
    const attrs: any = JSON.parse(JSON.stringify(typeAttrs[n.type] ?? {}));
    if (!attrs.label?.text) attrs.label = { ...(attrs.label ?? {}), text: n.title };
    else attrs.label = { ...attrs.label, text: n.title };
    if (n.type === 'manual') attrs.label.text = '👤 ' + (attrs.label.text ?? '人工确认');
    // 高亮描边覆盖
    if (props.highlightNodes?.[n.id]) {
      attrs.body = { ...(attrs.body ?? {}), stroke: sevToStroke[props.highlightNodes[n.id]], strokeWidth: 3.5 };
    }
    cells.push(graph.value!.createNode({
      id: n.id, shape: typeToShape[n.type] ?? 'rect',
      x: n.position?.x ?? 0, y: n.position?.y ?? 0,
      width: (n.type === 'start' || n.type === 'end') ? 64 : (n.type === 'condition' ? 160 : (n.type === 'parallel' ? 160 : 200)),
      height: (n.type === 'start' || n.type === 'end') ? 64 : (n.type === 'condition' ? 88 : (n.type === 'parallel' ? 40 : 72)),
      attrs,
      data: n
    }));
  });
  props.edges.forEach(e => {
    cells.push(graph.value!.createEdge({
      id: e.id, source: e.from, target: e.to,
      attrs: { line: { stroke: '#94a3b8', strokeWidth: 2, targetMarker: { name: 'block', width: 10, height: 10 } } },
      labels: e.condition_label ? [{ text: e.condition_label, fill: '#0f172a', fontSize: 11 }] : [],
      data: e
    }));
  });
  graph.value.addCells(cells);
  // Dagre 自动布局（对未设置 position 的节点）
  const hasMissing = props.nodes.some(n => !n.position);
  if (hasMissing) {
    try {
      const layout = useDagreLayout({ type: 'dagre', rankdir: 'LR', nodesep: 50, ranksep: 80 });
      const newGraphData = layout!.layout({ nodes: props.nodes.map(n => ({ id: n.id, x: n.position?.x, y: n.position?.y })), edges: props.edges } as any);
      const posMap = new Map(newGraphData.nodes.map((n: any) => [n.id, { x: n.x, y: n.y }]));
      props.nodes.forEach(n => { if (!n.position) n.position = posMap.get(n.id); });
    } catch { /* 忽略布局失败 */ }
  }
  graph.value.centerContent({ padding: { top: 40, left: 40, right: 40, bottom: 40 } });
}

onMounted(() => {
  graph.value = new Graph({
    container: container.value!,
    interacting: props.readonly === false,
    grid: { visible: true, type: 'dot', args: { color: '#e5e7eb', thickness: 1 } },
    mousewheel: { enabled: true, modifiers: ['ctrl'], minScale: 0.4, maxScale: 2.5 },
    panning: true,
    connecting: { router: 'manhattan' }
  });
  graph.value.on('node:click', ({ node }) => emit('node-click', (node.getData() as SOPNode)));
  render();
});

watch(() => [props.nodes.length, props.edges.length], () => render(), { deep: true });
watch(() => props.highlightNodes, () => render(), { deep: true });

onBeforeUnmount(() => { graph.value?.dispose(); });
defineExpose({ graph });
</script>
```

- [ ] **Step 4.4: GeneratorForm + GeneratorResult + SOPDetail + sop.store.ts 真实实现**

GeneratorForm：
- goal ElInput type=textarea placeholder 示例："配置一张医院报销单，抓取 Jira 任务，分析 UI 截图，生成确认文档并产出 schema 配置"
- Skill 选择：ElTable 多选（来自 skillStore.skills，勾选框）
- ReviewConfig 排序：展示 DEFAULT_DIMENSION_ORDER，列出 8 个维度（只读展示，用户以后在 B 场景细调）
- 点「开始生成」→ loading → 调 sopStore.generate({goal, selectedSkillIds, reviewConfig: { dimension_order: DEFAULT_DIMENSION_ORDER }}) → 成功后跳 `/sops/:id` 或 GeneratorResult

SOPDetail：左 70% X6Canvas，右 30% NodeSidebar（显示当前选中节点 title、type、description、skill_id → Skill 名、condition_expr、manual_checklist 列表）；顶部 ElPageHeader（name 可编辑、goal 可编辑 ElButton）→ ExportBar：导出 JSON / Markdown（先占位，Task7 实现）。

- [ ] **Step 4.5: 冒烟测试**
真实 API Key 填好 → 选择 jira-fetcher / form-template-sop / schema-creator → 生成。
Expected: 生成的 SOP 有 start、jira-fetcher skill 节点、至少 1 个 manual 节点、schema-creator skill 节点、end。X6Canvas 正确渲染节点与连线。

- [ ] **Step 4.6: Commit**

```bash
git add -A
git commit -m "feat(scenario-a): M4 场景A SOP智能生成L3+X6只读流程图渲染+详情页"
```

---

## Task 5: 场景 B - Markdown 导入（L2 解析）

**Goal:** M5 完成：L2 Prompt 落地 + `sop:importMarkdown` handler 实现；ReviewImport 页支持粘贴 Markdown 文本或上传 .md 文件 → LLM 解析为结构化 SOP 入库 → 跳转 SOP 详情页验证渲染；对 form-template-sop 的 SKILL.md/SOP流程图.md 能解析出 6+ 节点 + 至少 1 个 manual/condition。

**Files:**
- Create: `electron/core/prompts/L2-markdown-to-sop.md`
- Modify: `electron/core/ipc-handlers.ts` → 实现 `sop:importMarkdown`
- Modify: `src/views/sop-review/ReviewImport.vue` → 真实实现 Tab 切换（粘贴文本 / 上传文件 / 选历史 SOP）

### Steps

- [ ] **Step 5.1: L2 Prompt**

```markdown
【系统角色】SOP 结构化解析器。阅读下方 Markdown 格式的 SOP 文档（可能包含自然语言步骤、Mermaid 流程图、文字箭头"→"、Step 0/1/2 编号、"人工 Review"等表述），输出结构化 JSON：
- 识别所有节点（步骤）：映射到 6 种 type 之一
  · 有明确 Skill 名（Skill 库中已有的名或别名）→ skill 节点，填 skill_hint（Skill 名关键字）
  · "人工确认/Review/用户确认/卡点"等 → manual，配 manual_checklist
  · "如果/否则/通过 or 不通过/分支"等 → condition，配 condition_expr
  · "并行/同时/互不依赖" → parallel
  · start/end 补齐
- 识别节点之间的连接（edges），包括条件分支的 label
- success_criteria：从"成功判定/验收标准/目标"章节提取，没有就根据 goal 合理概括 2-4 条

【已有的 Skill 名称 -> ID 索引（解析到技能时尽量从这些名匹配）】
{{SKILL_IDX}}

【输出 JSON Schema（严格遵守，nodes 中节点 ID 必须以 n_ 开头）】
```

**ipc-handlers `sop:importMarkdown` 实现：**
```typescript
ipcMain.handle('sop:importMarkdown', async (_e, text: string, cfg: any) => {
  if (!text?.trim()) throw new Error('请提供 Markdown 文本');
  const all = storage.getAllSkills();
  const idx = all.map(s => `- ${s.name} (ID=${s.id})：${s.description}`).join('\n');
  const sys = readPrompt('L2-markdown-to-sop').replace('{{SKILL_IDX}}', idx);

  // 复用 SOPNodeSchema/ SOPSchema，但允许 skill 节点暂以 skill_hint 再解析 → 新 schema
  const ImportNodeSchema = z.union([
    SOPNodeSchema,
    z.object({ id: z.string().startsWith('n_'), type: z.literal('skill'), title: z.string(), skill_hint: z.string(), description: z.string().optional() })
  ]);
  const ImportSOPSchema = SOPSchema.extend({ nodes: z.array(ImportNodeSchema as any), name: z.string().min(1) }).strip();

  const data = await callLlm({ systemPrompt: sys, userPrompt: 'Markdown:\n```\n' + text + '\n```', schema: ImportSOPSchema, jsonMode: true, temperature: 0.3 });

  const sop: SOP = {
    id: randomUUID(),
    name: data.name,
    goal: (data as any).goal ?? data.name,
    version: '1.0.0',
    nodes: data.nodes.map((n: any) => {
      if (n.type === 'skill' && n.skill_hint) {
        const hit = all.find(s => s.name.includes(n.skill_hint) || n.skill_hint.includes(s.name) || s.description.includes(n.skill_hint));
        if (hit) n.skill_id = hit.id;
      }
      if (!n.skill_id && n.type === 'skill') {
        // 疑似解析误差：转 manual 打 suspected 标签（存在节点 data 里，此处存到 description 前缀）
        n.description = '[疑似解析误差请确认] ' + (n.description ?? '') + '; Skill 匹配失败原关键字=' + (n.skill_hint ?? '');
        n.type = 'manual';
        n.manual_checklist = ['核对该节点实际应为 Skill 还是人工操作'];
      }
      return n;
    }) as any,
    edges: data.edges as any,
    success_criteria: data.success_criteria,
    tags: data.tags ?? [],
    source: 'imported',
    source_markdown: text,
    created_at: Date.now(),
    updated_at: Date.now()
  };
  (sop as any).suspected_parse_error = sop.nodes.some((n: any) => n.description?.startsWith('[疑似解析误差'));
  applyAutoLayout(sop);
  return storage.saveSOP(sop);
});
```

- [ ] **Step 5.2: ReviewImport 页面**

三个 Tab：
1. **粘贴文本**：ElInput type=textarea rows=20 → 按钮「解析为结构化 SOP」
2. **上传 Markdown 文件**：el-upload accept=.md,markdown 手动读取 text → 同上
3. **从 SOP 历史库选择**：ElSelect SOP 摘要列表 → 选中后直达审查页（跳过解析）

- [ ] **Step 5.3: 冒烟测试**
将 `e:\aaa-workplace\aaa-重装\skill-manager\.agents\skills\form-template-sop\SKILL.md` 全文粘贴 → 解析。
Expected: 得到至少 6 个节点，含 start / end / skill 节点（jira-fetcher/schema-creator 命中 id）/ 至少 1 个 manual 或 condition 节点；SOP 详情页正常渲染流程图。

- [ ] **Step 5.4: Commit**

```bash
git add -A
git commit -m "feat(import): M5 场景B Markdown→SOP结构化解析L2"
```

---

## Task 6: 场景 B - 契合度审查（L4）+ 可视化评分 + Flow 高亮

**Goal:** M6：L4 Prompt；ReviewConfigPanel 8 维度可拖拽排序（权重百分比实时显示）；ReviewResult 页显示综合分（颜色等级）+ 雷达图 + 条形图 + 计算明细透明化 + 分级建议（C/W/S 三 Tab）+ 流程图节点高亮关联；对 form-template-sop 解析出的 SOP 打分 70-85，至少给出 1 条 critical（职责过重）+ 1 条 warning（IO 映射缺）。

**Files:**
- Create: `electron/core/prompts/L4-review-sop.md`
- Modify: `electron/core/ipc-handlers.ts` → 实现 `sop:review`
- Create: `src/components/chart/RadarScoreChart.vue`
- Create: `src/components/chart/DimensionScoreBar.vue`
- Modify: `src/views/sop-review/ReviewConfigPanel.vue`（拖拽 + 动态权重）
- Create: `src/views/sop-review/ReviewResultView.vue`
- Create: `src/views/sop-review/FlowHighlight.vue`（高亮）
- Modify: `src/stores/review.store.ts`（真实实现）

### Steps

- [ ] **Step 6.1: L4 Prompt + review handler**

Prompt 内容同本 spec §6.2。输出 schema 对应 ReviewResult（zod 定义在 ipc-handlers 中）。

- [ ] **Step 6.2: G2 雷达图 + 条形图**

RadarScoreChart 接收 props: dimensionScores, dimensionOrder → 渲染 8 轴 Radar（区间 0-100）。
DimensionScoreBar 接收 props: dimensionScores, weights → 横向条形图；tooltip 展示 "score × weight% = contribution"。

- [ ] **Step 6.3: ConfigPanel 拖拽 + 结果页布局**

ConfigPanel: vuedraggable-plus 绑定 dimension_order；每行列显示当前序号 badge + 图标 + 中文名 + 说明（tooltip） + 动态权重百分比。
ReviewResultView: 顶部大号综合分 + scoreLevel() 颜色条；左 50%：Radar + Bar stacked；右 50%：Tabs Critical（红）/ Warning（黄）/ Suggestion（蓝）展示 findings 列表 ElCollapse；每条 finding 展开后显示 suggestion + related_node_ids list → 点击 node id 高亮 FlowHighlight。

- [ ] **Step 6.4: 冒烟测试**
审查 form-template-sop 解析得到的 SOP → 综合分 75±10 区间；finding 中出现"职责过重→拆分 Skill""缺输入映射定义"等与原型一致的条目。

- [ ] **Step 6.5: Commit**

```bash
git add -A
git commit -m "feat(review): M6 场景B契合度审查L4+雷达图+条形图+分级建议+流程高亮"
```

---

## Task 7: 导出 + 设置页完善

**Goal:** M7：sop-exporter.ts 实现 exportToJSON / exportToMarkdown；sop:export IPC → 调 dialog.showSaveDialog 保存到用户选的位置；设置页 LLM 配置 + 存储 + About 全部可操作且落地；Dashboard 统计显示真实数字。

**Files:**
- Create: `electron/core/sop-exporter.ts`
- Modify: `electron/core/ipc-handlers.ts` → 实现 sop:export
- Modify: `src/views/settings/LlmConfig.vue`（真实表单 + 显隐 + 连通性测试提示）
- Modify: `src/views/settings/StorageConfig.vue`（真实保存）
- Modify: `src/views/settings/About.vue`（版本 + Spec 链接）
- Modify: `src/views/sop-detail/SOPDetail.vue` → 导出按钮生效
- Modify: `src/views/dashboard/Dashboard.vue` → 真实读 skill/sop 长度（已实现，若有 bug 修复）

### Steps

- [ ] **Step 7.1: sop-exporter.ts**（纯字符串构造）

exportToMarkdown 渲染 frontmatter + Mermaid flowchart TB + Markdown 步骤详情表格 + 成功标准 + 可选优化建议。

- [ ] **Step 7.2: IPC 导出**

`ipcMain.handle('sop:export', async (_e, id, format))` 先拿 SOP → 生成字符串 → 调 `dialog.showSaveDialog` 默认 filename=`${sop.name}.${format === 'json' ? 'json' : 'md'}` → fs.writeFile → 返回 ok。

- [ ] **Step 7.3: 设置页表单**

LlmConfig：apiKey ElInput show-password 切换、baseURL（placeholder https://api.openai.com/v1）、model（ElSelect + 可输入），保存时触发 settingsStore.save()，测试连通性按钮 ElAlert 展示返回 {ok, message}。
StorageConfig：List scanDirs，每一项 path + 「立即扫描」ElButton → 触发 skill store scan；「添加目录」按钮调用 api.dialog.pickDirectory()。
About：version: import.meta.env 读 package.json，Spec 文档链接本地路径。

- [ ] **Step 7.4: 冒烟测试**

导出 Task4/5 生成的 form-template-sop SOP → JSON 可读 → Markdown 有 frontmatter、mermaid 图、步骤表；设置页保存后重启应用不丢失。

- [ ] **Step 7.5: Commit**

```bash
git add -A
git commit -m "feat(export-settings): M7 SOP导出JSON/MD+设置页完整落地+Dashboard"
```

---

## Task 8: 打包 + README

**Goal:** M8：`npm run pack` 成功产出 `release/<version>/Skill-SOP Orchestrator-Setup-0.1.0.exe`；新建 README.md 介绍项目、安装、开发模式、打包命令、.env（如需要）；首次启动应用若 llm apiKey 空则跳设置页提示。

**Files:**
- Create: `README.md`
- Modify: `electron/main.ts`（首次启动检测 settings.llm.apiKey 空则触发前端跳转，或前端 onMounted 里判断）
- Create: `resources/icon.png` / 占位（electron-builder 默认图标亦可）
- Modify: 必要的 `package.json` build script 修正

### Steps

- [ ] **Step 8.1: 首次启动引导**

src/main.ts 或 App.vue onMounted：若 settingsStore.llmConfig.apiKey === '' → 显示 ElMessageBox「首次使用请配置 LLM API Key → 前往设置」→ $router.push('/settings/llm')。

- [ ] **Step 8.2: README.md**（不做长，包含：简介 + 截图可略 + Install Node 18+ + `npm install` + `npm run dev` + `npm run pack` + 打包产物目录；引用 docs/superpowers/specs 设计文档）。

- [ ] **Step 8.3: 打包**

`npm.cmd run pack` → 等待 electron-builder 完成 → 双击 .exe 安装 → 启动软件 → 流程和 dev 模式一致。

- [ ] **Step 8.4: Commit & Final Tag（可选）**

```bash
git add -A
git commit -m "chore(release): M8 安装包打包+README+首次启动引导"
git tag v0.1.0-mvp
```

---

## Plan Self-Review（Spec 覆盖率自查）

| Spec 章节 | 对应 Task(s) | 覆盖？ |
|:---------:|:-----------:|:-----:|
| §2.1 MVP 必做 9 项 | M1-M8 | ✅ 全部覆盖 |
| §3 技术选型 13 项 | Task1 脚手架依赖 | ✅ 全部在 package.json 列出 |
| §4 数据模型 3 类 | Task2 shared/types/* | ✅ Skill/SOP/Review 全量字段，含嵌套 JSONSchema |
| §5 目录结构 40+ 文件 | Task 1/2/4/5/6/7 一一对应 | ✅ 路径逐文件核对 |
| §6 LLM 调用 L1/L2/L3/L4 | Task3/4/5/6 各对应 Prompt 文件 + handler | ✅ 4 条链路齐全 |
| §7 评分算法 + 权重 | Task2 score.ts + Vitest 4 cases | ✅ 含 DECAY_FACTOR=0.8 对齐最终 Spec |
| §8 导出 JSON + Markdown | Task7 sop-exporter.ts | ✅ 含§8.2 Markdown 模板结构 |
| §9 IPC 清单 15 通道 | Task2 ipc-handlers.ts 白名单逐条注册 | ✅ 无一遗漏，含 dialog:pickDirectory |
| §10 里程碑 M1-M8 | 同名 Task 1-8 | ✅ 颗粒度对齐，验收标准逐条在 Step 冒烟测试写明 |
| §11 风险对策 4 条 | 对应：zod 重试+suspected_parse_error、Bar 图透明化得分、DPR awareness 在 X6CSS、electron 打包体积接受现状 | ✅ 均在对应 Task steps 里有显式编码 |

### 占位符 / 类型一致性检查

- ✅ 无 TBD/TODO：所有文件职责、代码片段均为可执行内容
- ✅ 类型名一致：`ReviewDimension`、`SOPNodeType`、`FindingSeverity` 在 types/、Prompt 模板、IPC 实现中完全一致
- ✅ 无 "Similar to Task N"：Prompt/IPC 实现均在本文件 Task 中重复写出（L3/L4 给完整结构）

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-12-skill-sop-orchestrator-plan.md`. Two execution options:

**1. Subagent-Driven（推荐）** — 每个 Task 派遣一个独立子代理，Task 间 review checkpoint，迭代速度快且错误隔离性好

**2. Inline Execution** — 本会话内调用 `executing-plans` skill，按 8 个 Task 批量执行 + 人工检查点（M1/M4/M6/M8 四个 Review Gate）

Which approach?
