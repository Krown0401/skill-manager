#!/usr/bin/env node

/**
 * form-template-sop MCP Server
 *
 * 提供登录和凭证配置查询能力，供 AI 在 Step 3 调用：
 *   1. 登录系统获取 token
 *   2. 获取凭证字段定义、字典、表单配置、行为模型
 *   3. AI 将接口数据与 Step 2 分析结果合并，生成确认文档
 *
 * 内部实现待后续处理，当前为骨架。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---- lib ----
import { loginByHospital, listHospitals } from "./lib/login.js";
import {
  getCertificateFields,
  getDictionary,
  getFormConfig,
  getBehaviorModel,
} from "./lib/certificate-api.js";

// ---- Session state ----
let session = {
  token: null,
  baseUrl: null,
  resourcePoolId: null,
  hospitalCode: null,
  hospitalName: null,
  username: null,
};

// ---- Server ----
const server = new McpServer({
  name: "form-template-sop-mcp",
  version: "0.1.0",
});

// ---- Tool: login_to_hospital ----
server.tool(
  "login_to_hospital",
  "根据医院名称登录 SaaS 系统，获取认证 token。AI 可根据 accounts.json 中的医院列表决策使用哪个账号。",
  {
    hospitalName: z.string().describe("医院名称，如「华西」「湖南人民医院」"),
  },
  async ({ hospitalName }) => {
    try {
      const result = await loginByHospital(hospitalName);

      session = {
        token: result.token,
        baseUrl: result.baseUrl,
        hospitalCode: result.hospitalCode,
        hospitalName: result.hospitalName,
        username: result.username,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                token: result.token,
                baseUrl: result.baseUrl,
                hospitalCode: result.hospitalCode,
                hospitalName: result.hospitalName,
                username: result.username,
                lastLoginTime: result.lastLoginTime,
                note: result.phoneLogin
                  ? "需要短信验证，暂不支持"
                  : result.modifyPsw
                    ? "密码即将过期"
                    : "登录成功",
                message:
                  "登录成功。token 已缓存，后续调用其他工具无需再传 token。",
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `登录失败：${err.message}\n\n可用医院：${listHospitals().join("、")}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ---- Tool: get_certificate_fields ----
server.tool(
  "get_certificate_fields",
  "获取指定凭证的字段定义列表，包括字段名、类型、是否必填、字典编码等信息。",
  {
    certCode: z.string().describe("凭证定义编码，如「domesticStudyApplication」"),
  },
  async ({ certCode }) => {
    if (!session.token) {
      return {
        content: [
          {
            type: "text",
            text: "未登录，请先调用 login_to_hospital 登录。",
          },
        ],
        isError: true,
      };
    }

    try {
      const data = await getCertificateFields(
        certCode,
        session.token,
        session.baseUrl
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `获取字段定义失败：${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---- Tool: get_dictionary ----
server.tool(
  "get_dictionary",
  "根据字段名称搜索字典，返回字典树及叶子节点的 label/value 对。filterCondition 为中文字段名，如「经费类型」「性别」「学历」。",
  {
    fieldName: z.string().describe("字段中文名称，如「经费类型」「学历」「性别」"),
  },
  async ({ fieldName }) => {
    if (!session.token) {
      return {
        content: [
          { type: "text", text: "未登录，请先调用 login_to_hospital 登录。" },
        ],
        isError: true,
      };
    }

    try {
      const data = await getDictionary(
        fieldName,
        session.token,
        session.baseUrl
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `获取字典失败：${err.message}` }],
        isError: true,
      };
    }
  }
);

// ---- Tool: get_form_config ----
server.tool(
  "get_form_config",
  "获取凭证的表单配置项，包括 fieldMapping（接口↔表单字段映射）、联动规则、校验规则等。",
  {
    certCode: z.string().describe("凭证定义编码"),
  },
  async ({ certCode }) => {
    if (!session.token) {
      return {
        content: [
          { type: "text", text: "未登录，请先调用 login_to_hospital 登录。" },
        ],
        isError: true,
      };
    }

    try {
      const data = await getFormConfig(
        certCode,
        session.token,
        session.baseUrl
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `获取表单配置失败：${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---- Tool: get_behavior_model ----
server.tool(
  "get_behavior_model",
  "获取单据的行为模型数据，包括状态流转、操作权限、审批节点等。",
  {
    certCode: z.string().describe("凭证定义编码"),
  },
  async ({ certCode }) => {
    if (!session.token) {
      return {
        content: [
          { type: "text", text: "未登录，请先调用 login_to_hospital 登录。" },
        ],
        isError: true,
      };
    }

    try {
      const data = await getBehaviorModel(
        certCode,
        session.token,
        session.baseUrl
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `获取行为模型失败：${err.message}` },
        ],
        isError: true,
      };
    }
  }
);

// ---- Start ----
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("form-template-sop MCP Server 已启动 (stdio)");
}

main().catch((err) => {
  console.error("MCP Server 启动失败:", err);
  process.exit(1);
});
