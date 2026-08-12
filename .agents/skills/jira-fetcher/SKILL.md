---
name: jira-fetcher
description: 从 Jira 链接抓取任务信息、下载附件、导出离线文档。用于表单配置 SOP 的 Step 0 要素收集阶段。
---

# Jira Fetcher Skill

## 功能概览

1. **获取任务信息** - 从 Jira 链接抓取结构化任务数据
2. **导出离线文档** - 生成可离线浏览的文档（含截图）

## 使用方法

### 1. 获取 Jira 任务信息

```bash
python scripts/fetch.py <Jira链接> [--raw]

# 示例
python scripts/fetch.py http://172.18.169.8:6899/browse/YLZHXT-3627
```

**返回字段**：
| 字段 | 说明 |
|------|------|
| jira_key | Jira Key |
| title | 标题 |
| description | 任务描述（完整） |
| status | 状态 |
| assignee / reporter | 经办人 / 报告人 |
| priority | 优先级 |
| fix_version | 版本号 |
| issue_type | 类型（需求/bug等） |
| attachments | 附件列表（filename, size, url） |

**选项**：
- `--raw` — 输出 Jira API 原始格式

### 2. 导出离线文档

```bash
python scripts/export.py <Jira链接>

# 示例
python scripts/export.py http://172.18.169.8:6899/browse/YLZHXT-3627
```

**输出格式**：
```
doc/{version}/{jira_key} {title} {end_type}/
├── index.md      # 结构化文档
└── attachments/  # 附件目录
```

**示例**：
```
doc/V2.0.3.4/YLZHXT-3627 新增外出进修申请单（PC+移动端） PC+移动端/
├── index.md
└── attachments/
    ├── 外出进修申请单.png
    └── 重庆儿童国内进修申请pc.png
```

## 目录结构

```
jira-fetcher/
├── SKILL.md           # 本文件
├── DESIGN.md          # 设计文档
├── config.yml         # 配置文件
├── scripts/           # CLI 入口
│   ├── fetch.py       # 获取任务信息
│   └── export.py      # 导出离线文档
├── lib/               # 核心库
│   └── jira_client.py
├── references/        # 参考文档
│   └── Jira配置.md
└── assets/            # 资源文件（预留）
```

## 配置说明

所有配置在 `config.yml` 中管理：

```yaml
jira:
  base_url: "http://172.18.169.8:6899"
  username: "巩芳旭"
  password: "OwnS7*#y"

timeout:
  connect: 5    # 连接超时（秒）
  read: 30      # 读取超时（秒）

export:
  root_dir: ""      # 项目根目录（留空自动检测）
  output_dir: "doc"  # 输出子目录
```

## 依赖

- Python 3.8+
- `requests`
- `beautifulsoup4`
- `pyyaml`

安装依赖：
```bash
pip3 install requests beautifulsoup4 pyyaml
```

## 与 SOP 的集成

本 skill 用于 form-template-sop 的 **Step 0 要素收集**：

```
jira-fetcher ──获取任务信息──→ form-template-sop Step 0 ──要素整理──→ Step 1 创建任务文件夹
```

使用流程：
1. 用户提供 Jira 链接
2. 用 `fetch.py` 获取任务详情（JSON）
3. 用 `export.py` 下载截图，生成离线文档供 AI 分析
4. AI 分析文档，进入后续 SOP 流程