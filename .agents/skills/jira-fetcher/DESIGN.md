# jira-fetcher 设计文档

## 一、背景

在表单配置 SOP 流程中，Step 0 需要从 Jira 链接获取任务信息（标题、描述、附件）。手工复制粘贴效率低且容易出错，需要一个自动化工具。

## 二、目标

1. **快速获取** - 输入 Jira 链接，一键获取任务详情
2. **离线文档** - 生成可离线浏览的文档（含截图）
3. **结构化输出** - 输出 JSON 格式，便于后续处理

## 三、功能设计

### 3.1 获取任务信息 (fetch)

输入：Jira 链接
输出：JSON 格式的任务详情

返回字段：
- `jira_key` - Jira Key
- `title` - 标题
- `description` - 任务描述
- `status` - 状态
- `assignee/reporter` - 经办人/报告人
- `priority` - 优先级
- `fix_version` - 版本号
- `attachments` - 附件列表

### 3.2 导出离线文档 (export)

输入：Jira 链接
输出：本地文档目录

输出结构：
```
doc/{version}/{jira_key} {title} {end_type}/
├── index.md      # 结构化文档
└── attachments/  # 附件目录
```

## 四、认证设计

使用 Jira 表单登录认证（Cookie 认证）：
1. 访问 Jira 首页获取登录表单和 CSRF token
2. POST 登录表单（os_username, os_password, atl_token）
3. 获取 JSESSIONID cookie，后续 API 请求复用此 cookie

## 五、目录结构

```
jira-fetcher/
├── SKILL.md           # 技能说明
├── DESIGN.md          # 本文档
├── config.yml         # 配置文件
├── scripts/           # CLI 入口
│   ├── fetch.py       # 获取任务信息
│   └── export.py      # 导出离线文档
├── lib/               # 核心库
│   ├── __init__.py
│   └── jira_client.py # JiraClient 类
├── references/        # 参考文档
│   └── Jira配置.md
└── assets/            # 资源文件（预留）
```

## 六、与 SOP 的集成

```
jira-fetcher ──获取任务信息──→ form-template-sop Step 0
```

使用流程：
1. 用户提供 Jira 链接
2. 用 `fetch.py` 获取任务详情（JSON）
3. 用 `export.py` 下载截图，生成离线文档
4. AI 分析文档，进入后续 SOP 流程
