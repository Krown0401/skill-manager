#!/usr/bin/env node

/**
 * Step 3: 数据富化与智能比对
 *
 * 功能：
 *   1. 自动登录目标医院
 *   2. 根据单据名搜索并锁定 certCode
 *   3. 抓取凭证定义、表单配置和关键字典
 *   4. 将 Step 2 的 AI 分析结果与接口数据进行智能比对匹配
 *   5. 产出 enriched-combined.json 供文档生成
 *
 * 用法:
 *   node step3-enrich-data.mjs \
 *     --task-dir tasks/<任务目录> \
 *     --hospital "<医院名称>" \
 *     --keyword "<单据名关键字>"
 */

import { loginByHospital } from "../mcp/lib/login.js";
import { getCertificateFields, getDictionary, getFormConfig, listCertificates } from "../mcp/lib/certificate-api.js";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function findTargetCert(keyword, token, baseUrl) {
  const certs = await listCertificates(token, baseUrl);
  for (const at of certs) {
    if (!at.data) continue;
    const found = at.data.find((c) => (c.certName && c.certName.includes(keyword)) || (c.certCode && c.certCode.includes(keyword)));
    if (found) return found;
  }
  return null;
}

// 递归搜索目录下的所有 form.json
function getAllFormJsons(dir, results = []) {
  if (!existsSync(dir)) return results;
  const files = readdirSync(dir);
  for (const file of files) {
    const path = join(dir, file);
    if (statSync(path).isDirectory()) {
      getAllFormJsons(path, results);
    } else if (file === "form.json") {
      results.push(path);
    }
  }
  return results;
}

// 从 Schema 中提取字段映射索引
function extractFieldsFromSchema(schema, index = {}) {
  if (!schema || typeof schema !== "object") return index;
  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const title = value.title || (value["x-component-props"] && value["x-component-props"].title);
      if (title && !index[title]) {
        index[title] = {
          name: key,
          dictCode: value["x-data"]?.dict?.code || value["x-component-props"]?.dictCode,
          pc_component: value["x-component"],
          required: value.required
        };
      }
      extractFieldsFromSchema(value, index);
    }
  }
  if (schema.items) extractFieldsFromSchema(schema.items, index);
  return index;
}

async function main() {
  const args = process.argv.slice(2);
  const taskDirArg = args.indexOf("--task-dir");
  const hospitalArg = args.indexOf("--hospital");
  const keywordArg = args.indexOf("--keyword");
  const refHospitalArg = args.indexOf("--ref-hospital");
  const refKeywordArg = args.indexOf("--ref-keyword");
  const refPathArg = args.indexOf("--ref-path"); // 新增：本地配置参考路径

  if (taskDirArg === -1 || hospitalArg === -1 || keywordArg === -1) {
    console.error("用法: node step3-enrich-data.mjs --task-dir <dir> --hospital <hospital> --keyword <keyword> [--ref-hospital <ref-hosp> --ref-keyword <ref-key> --ref-path <path>]");
    process.exit(1);
  }

  const taskDir = resolve(process.cwd(), args[taskDirArg + 1]);
  const hospital = args[hospitalArg + 1];
  const keyword = args[keywordArg + 1];
  const refHospital = refHospitalArg !== -1 ? args[refHospitalArg + 1] : null;
  const refKeyword = refKeywordArg !== -1 ? args[refKeywordArg + 1] : null;
  const refPath = refPathArg !== -1 ? args[refPathArg + 1] : null;

  try {
    // 处理本地配置参考 (form.json)
    let localRefData = { pc: null, mobile: null };
    if (refPath) {
      console.log(`[Step 3] 正在加载本地参考配置: ${refPath}`);
      const pcFormPath = resolve(process.cwd(), refPath, "pc/form.json");
      const mobileFormPath = resolve(process.cwd(), refPath, "mobile/form.json");
      if (existsSync(pcFormPath)) {
        localRefData.pc = JSON.parse(readFileSync(pcFormPath, "utf-8"));
        console.log(`[Step 3] 已加载 PC 参考配置`);
      }
      if (existsSync(mobileFormPath)) {
        localRefData.mobile = JSON.parse(readFileSync(mobileFormPath, "utf-8"));
        console.log(`[Step 3] 已加载移动端参考配置`);
      }
    }

    console.log(`[Step 3] 正在登录目标医院 ${hospital}...`);
    const loginResult = await loginByHospital(hospital);
    const { token, baseUrl } = loginResult;

    // 构建同医院字段索引
    const hospitalIndex = {};
    console.log(`[Step 3] 正在扫描同医院单据以推测字段名...`);
    const projectRoot = process.cwd();
    const hospitalDirs = readdirSync(projectRoot).filter((d) => {
      if (!statSync(join(projectRoot, d)).isDirectory()) return false;
      // 极致模糊匹配：将医院名称拆分为字符，检查目录名是否按顺序包含这些字符（或反向包含）
      const h = hospital.replace(/医院|附属|大学/g, "");
      const dir = d.replace(/医院|附属|大学/g, "");

      // 如果目录名直接包含缩写，或者缩写包含目录名
      if (dir.includes(h) || h.includes(dir)) return true;

      // 或者拆分匹配（如 "重庆儿童" 匹配 "重庆...儿童..."）
      const keywords = h.split("");
      let lastIndex = -1;
      const match = keywords.every((k) => {
        const index = d.indexOf(k, lastIndex + 1);
        if (index > lastIndex) {
          lastIndex = index;
          return true;
        }
        return false;
      });
      return match;
    });
    for (const hDir of hospitalDirs) {
      const allForms = getAllFormJsons(join(projectRoot, hDir));
      for (const fPath of allForms) {
        try {
          const schema = JSON.parse(readFileSync(fPath, "utf-8"));
          extractFieldsFromSchema(schema, hospitalIndex);
        } catch (e) {}
      }
    }
    console.log(`[Step 3] 已索引 ${Object.keys(hospitalIndex).length} 个同医院字段名称`);

    console.log(`[Step 3] 正在搜索目标单据: ${keyword}...`);
    const targetCert = await findTargetCert(keyword, token, baseUrl);
    if (!targetCert) {
      throw new Error(`未能在目标系统中找到包含关键字「${keyword}」的单据`);
    }
    const certCode = targetCert.certCode;
    console.log(`[Step 3] 已锁定目标凭证: ${targetCert.certName} (${certCode})`);

    console.log(`[Step 3] 正在抓取目标凭证定义与表单配置...`);
    const fieldDef = await getCertificateFields(certCode, token, baseUrl);

    // 处理参考单据
    let refFieldDef = null;
    let refCertName = "";
    if (refHospital && refKeyword) {
      console.log(`[Step 3] 正在登录参考医院 ${refHospital}...`);
      try {
        const refLogin = await loginByHospital(refHospital);
        console.log(`[Step 3] 正在搜索参考单据: ${refKeyword}...`);
        const refCert = await findTargetCert(refKeyword, refLogin.token, refLogin.baseUrl);
        if (refCert) {
          refCertName = refCert.certName;
          console.log(`[Step 3] 已锁定参考凭证: ${refCertName} (${refCert.certCode})`);
          refFieldDef = await getCertificateFields(refCert.certCode, refLogin.token, refLogin.baseUrl);
        }
      } catch (e) {
        console.warn(`[Step 3] 获取参考单据数据失败: ${e.message}`);
      }
    }
    const formConfig = await getFormConfig(certCode, token, baseUrl);

    // 自动发现分析结果文件
    const analysisDir = resolve(taskDir, "分析结果");
    const taskBasename = taskDir.split("/").pop();
    // 提取 Jira ID (如 YLZHXT-4982)
    const jiraIdMatch = taskBasename.match(/^[A-Z]+-\d+/);
    const jiraId = jiraIdMatch ? jiraIdMatch[0] : taskBasename.split("-")[0];

    const pcPath = resolve(analysisDir, `${jiraId}-PC-分析结果.json`);
    const mobilePath = resolve(analysisDir, `${jiraId}-Mobile-分析结果.json`);

    if (!existsSync(pcPath)) {
      throw new Error(`找不到 PC 分析结果文件: ${pcPath}`);
    }
    if (!existsSync(mobilePath)) {
      throw new Error(`找不到移动端分析结果文件: ${mobilePath}`);
    }

    const pcAnalysis = JSON.parse(readFileSync(pcPath, "utf-8"));
    const mobileAnalysis = JSON.parse(readFileSync(mobilePath, "utf-8"));

    // 智能查询字典
    const dictKeywords = [
      ...new Set([
        ...pcAnalysis.fields.filter((f) => f.component.includes("选择") || f.component.includes("下拉")).map((f) => f.title),
        "岗位等级",
        "支出项目",
        "支付方式",
        "交通工具",
        "座次等级" // 保底必备
      ])
    ];

    const dictionaries = {};
    for (const kw of dictKeywords) {
      if (!kw) continue;
      console.log(`[Step 3] 正在校验字典: ${kw}...`);
      try {
        dictionaries[kw] = await getDictionary(kw, token, baseUrl);
      } catch (e) {
        console.warn(`[Step 3] 字典查询失败: ${kw}`);
      }
    }

    // 核心智能比对逻辑
    const findApiField = (title, name, def) => {
      if (!def) return null;
      // 1. 精确匹配
      let found = def.fields.find((af) => (af.title && af.title === title) || (af.name && af.name === name));
      if (found) return found;

      // 2. 包含匹配 (UI 包含 API 或 API 包含 UI)
      found = def.fields.find((af) => af.title && title && (af.title.includes(title) || title.includes(af.title)));
      if (found) return found;

      // 3. 业务语义匹配 (常用同义词)
      const synonyms = {
        进修人员: ["报销人", "人员", "申请人", "员工姓名", "报销人员"],
        进修地点: ["地点", "目的地", "出差地点", "进修城市", "出差城市"],
        联系方式: ["电话", "手机", "联系电话", "联系方式"],
        付款方式: ["支付方式", "费用支付方式", "付款类型", "支付类型", "结算方式"],
        座次等级: ["舱位", "席位", "等级", "席别", "舱位等级", "交通工具等级"],
        岗位等级: ["人员职级", "职级", "职称", "岗位", "等级"],
        进修天数: ["天数", "补助天数", "出差天数"],
        开始时间: ["开始日期", "出发日期", "发生日期", "实际开始时间", "实际开始日期"],
        结束时间: ["结束日期", "返回日期", "实际结束时间", "实际结束日期"]
      };
      const list = synonyms[title] || [];
      for (const syn of list) {
        found = def.fields.find((af) => af.title === syn);
        if (found) return found;
      }

      return null;
    };

    // 组件类型映射表：中文描述 -> 实际组件名
    const componentMap = {
      pc: {
        文本输入: "DtInput",
        下拉选择: "DtSelect",
        日期选择: "DtDatePicker",
        人员选择: "TaxBasePersonTreeTableDialogSelect",
        金额输入: "DtAmountInput",
        多行文本: "DtTextArea",
        部门选择: "TaxBaseAgencySelectTreeDict",
        地址选择: "TaxBaseRegionCascader"
      },
      mobile: {
        文本输入: "DtFNutInput",
        下拉选择: "DtFNutActionSheet",
        日期选择: "DtFNutDatePicker",
        人员选择: "RsPersonSelect",
        金额输入: "DtFNutInputNumber",
        多行文本: "DtFNutTextarea",
        部门选择: "RsDeptSelect",
        地址选择: "RsAddress"
      }
    };

    const getComponentName = (type, side, defaultName) => {
      if (!type) return defaultName;
      // 如果已经是组件名（以 Dt/Tax/Rs 开头），直接返回
      if (/^(Dt|Tax|Rs|FormItem)/.test(type)) return type;
      return componentMap[side][type] || defaultName || type;
    };

    // 从 form.json schema 中递归寻找匹配 title 的字段
    const findInLocalSchema = (title, schema) => {
      if (!schema || typeof schema !== "object") return null;

      // 尝试匹配当前层级的属性
      if (schema.properties) {
        for (const [key, value] of Object.entries(schema.properties)) {
          // 如果是 DtDateRangePicker，key 可能包含多个字段，通常匹配 title 即可
          if (value.title === title || (value["x-component-props"] && value["x-component-props"].title === title)) {
            return { name: key, ...value };
          }
          // 递归查找
          const found = findInLocalSchema(title, value);
          if (found) return found;
        }
      }

      // 处理 items (数组类型)
      if (schema.items) {
        return findInLocalSchema(title, schema.items);
      }

      return null;
    };

    const fields_verified = pcAnalysis.fields.map((f) => {
      const apiField = findApiField(f.title, null, fieldDef);
      const hospitalRef = hospitalIndex[f.title];
      const mobileField = mobileAnalysis.fields.find((mf) => mf.title === f.title);

      // 基础组件名转换
      let pc_comp = getComponentName(f.component, "pc", "DtInput");
      let mobile_comp = getComponentName(mobileField ? mobileField.component : null, "mobile", "DtFNutInput");

      if (apiField) {
        return {
          ...f,
          name: apiField.name,
          pc_component: pc_comp,
          mobile_component: mobile_comp,
          required: apiField.isRequired,
          _source: "接口确认",
          _dictCheck: apiField.isDict
            ? {
                found: dictionaries[f.title] && dictionaries[f.title].matchCount > 0,
                options: dictionaries[f.title] ? dictionaries[f.title].items : []
              }
            : null
        };
      }

      // 新增：优先从本地参考配置寻找
      const localPcField = findInLocalSchema(f.title, localRefData.pc);
      const localMobileField = findInLocalSchema(f.title, localRefData.mobile);

      if (localPcField || localMobileField) {
        return {
          ...f,
          name: localPcField ? localPcField.name : localMobileField ? localMobileField.name : f.name,
          pc_component: localPcField ? localPcField["x-component"] || pc_comp : pc_comp,
          mobile_component: localMobileField ? localMobileField["x-component"] || mobile_comp : mobile_comp,
          required: localPcField ? localPcField.required : f.required,
          _source: `参考[${refKeyword || "参考单据"}]`,
          _dictCheck: null
        };
      }

      // 新增：从同医院索引推测
      if (hospitalRef) {
        return {
          ...f,
          name: hospitalRef.name,
          pc_component: hospitalRef.pc_component || pc_comp,
          mobile_component: mobile_comp,
          required: hospitalRef.required || f.required,
          _source: "同医院推测",
          _dictCheck: hospitalRef.dictCode ? { found: true, options: [{ dictCode: hospitalRef.dictCode }] } : null
        };
      }

      // 如果本地也没找到，尝试从参考医院的接口补全
      const refField = findApiField(f.title, null, refFieldDef);
      if (refField) {
        return {
          ...f,
          name: refField.name,
          pc_component: pc_comp,
          mobile_component: mobile_comp,
          required: refField.isRequired,
          _source: `参考[${refCertName}]`,
          _dictCheck: refField.isDict
            ? {
                found: dictionaries[f.title] && dictionaries[f.title].matchCount > 0,
                options: dictionaries[f.title] ? dictionaries[f.title].items : []
              }
            : null
        };
      }

      return {
        ...f,
        name: f.name,
        pc_component: f.component,
        mobile_component: mobileField ? mobileField.component : "待确认",
        required: f.required,
        _source: "截图推测",
        _dictCheck: null
      };
    });

    const table_fields = pcAnalysis.sections
      .filter((s) => s.type === "table")
      .map((s) => {
        const tableFields = s.columns.map((col, idx) => {
          const apiField = findApiField(col.title, null, fieldDef);
          const hospitalRef = hospitalIndex[col.title];
          const localPcField = findInLocalSchema(col.title, localRefData.pc);
          const localMobileField = findInLocalSchema(col.title, localRefData.mobile);
          const refField = !apiField ? findApiField(col.title, null, refFieldDef) : null;

          const finalField = apiField || localPcField || localMobileField || hospitalRef || refField;
          let source = apiField ? "接口确认" : "截图推测";
          if (!apiField) {
            if (localPcField || localMobileField) source = `参考[${refKeyword || "参考单据"}]`;
            else if (hospitalRef) source = "同医院推测";
            else if (refField) source = `参考[${refCertName}]`;
          }

          // 表格内组件转换
          let pc_comp = localPcField ? localPcField["x-component"] || "DtInput" : hospitalRef ? hospitalRef.pc_component : apiField ? apiField.componentType : "DtInput";
          let mobile_comp = localMobileField ? localMobileField["x-component"] || "待确认" : "待确认";

          // 映射中文描述
          pc_comp = getComponentName(pc_comp, "pc", "DtInput");
          mobile_comp = getComponentName(mobile_comp, "mobile", "DtFNutInput");

          return {
            seq: idx + 1,
            title: col.title,
            name: finalField ? finalField.name || finalField.metadataCertificateCode || `col${idx}` : `col${idx}`,
            pc_component: pc_comp,
            mobile_component: mobile_comp,
            required: finalField ? finalField.isRequired || finalField.required || false : col.required,
            _source: source,
            _dictCheck:
              finalField && (finalField.isDict || finalField.dictCode)
                ? {
                    found: true,
                    options: [{ dictCode: finalField.dictCode || (dictionaries[col.title] ? dictionaries[col.title].items[0]?.dictCode : null) }]
                  }
                : null
          };
        });

        return {
          ...s,
          fields: tableFields
        };
      });

    const enriched = {
      task_info: pcAnalysis.task_info,
      reference: {
        certCode: fieldDef.certCode,
        certName: fieldDef.certName,
        totalFields: fieldDef.totalFields
      },
      data_fetch: {
        login: "成功",
        cert_search: "成功",
        dict_query: "完成"
      },
      header: pcAnalysis.sections.find((s) => s.type === "header") || null,
      sections: pcAnalysis.sections
        .filter((s) => s.type !== "header")
        .map((s) => {
          // 自动补全汇总逻辑
          if (s.title.includes("基本") || s.title.includes("信息")) {
            return {
              ...s,
              summary: [
                { label: "报销金额", value: "AUTO" },
                { label: "实付金额", value: "AUTO" }
              ]
            };
          }
          return s;
        }),
      fields_verified,
      table_fields,
      dictionaries,
      reactions: pcAnalysis.reactions,
      risks: pcAnalysis.risks,
      pc_mobile_diff: pcAnalysis.pc_mobile_diff
    };

    const outputPath = resolve(taskDir, "分析结果/enriched-combined.json");
    writeFileSync(outputPath, JSON.stringify(enriched, null, 2));
    console.log(`[Step 3] 完成！已生成 enriched JSON: ${outputPath}`);
  } catch (err) {
    console.error("[Step 3] 执行失败:", err.message);
    process.exit(1);
  }
}

main();
