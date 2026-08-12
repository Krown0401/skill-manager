# Jira 配置

## 连接信息

- **Jira 地址**: http://172.18.169.8:6899
- **API 地址**: http://172.18.169.8:6899/rest/api/2

## 认证方式

使用**表单登录认证**（Cookie 认证），无需 API Token。

## 账号配置

凭证信息在脚本中硬编码：

```python
# lib/jira_client.py 开头
JIRA_BASE_URL = "http://172.18.169.8:6899"
AUTH_USERNAME = "巩芳旭"
AUTH_PASSWORD = "OwnS7*#y"
```

如需修改，直接编辑 `lib/jira_client.py` 中的这三个变量。

## 登录流程

1. 访问 Jira 首页，获取登录表单和 CSRF token
2. POST 登录表单（os_username, os_password, atl_token）
3. 获取 JSESSIONID cookie，后续 API 请求复用此 cookie

## 常用 API

| 用途 | API |
|------|-----|
| 获取任务 | `GET /rest/api/2/issue/{jira_key}` |
| 搜索任务 | `GET /rest/api/2/search?jql=...` |
| 获取附件 | `GET /rest/api/2/issue/{jira_key}?fields=attachment` |

## 注意事项

- 账号密码包含特殊字符（如 `*#`）时，脚本使用 UTF-8 编码处理
- 登录失败会尝试重新登录一次
- 连接超时 5 秒，读取超时 30 秒