# form-template-sop MCP Server

登录 SaaS 系统获取凭证配置数据（字段定义、字典、表单配置、行为模型），供 AI 在 Step 3 调用。

## 启动

```bash
cd .agents/skills/form-template-sop/mcp
npm install
npm start
```

## 提供的 Tools

| Tool | 说明 |
|------|------|
| `login_to_hospital` | 登录系统获取 token |
| `get_certificate_fields` | 获取凭证字段定义 |
| `get_dictionary` | 获取字典项 |
| `get_form_config` | 获取表单配置（fieldMapping） |
| `get_behavior_model` | 获取行为模型 |

## Claude Code 配置

在 `.claude/settings.local.json` 或项目 `.mcp.json` 中添加：

```json
{
  "mcpServers": {
    "form-template-sop": {
      "command": "node",
      "args": [".agents/skills/form-template-sop/mcp/server.js"],
      "cwd": "${projectDir}"
    }
  }
}
```
