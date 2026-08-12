# PC 端 Formily 单据配置完整指南

本文档详细介绍完成一个 **PC 端** Formily 表单配置所需的完整流程和步骤。

> **适用说明**：本指南以 PC 端配置为主线。移动端配置仅在必要时提及，且需在 PC 端 schema 完成后再进行转换。

## 目录

- [一、需要准备的材料](#一需要准备的材料)
- [二、实施步骤](#二实施步骤)
- [三、PC 端最佳实践](#三pc-端最佳实践)
- [四、常见坑点](#四常见坑点)
- [五、核心原则](#五核心原则)

***

## 一、需要准备的材料

### 1. 业务需求文档

- **表单用途**：什么场景下使用（如差旅事前申请时人才经费需另提申请）
- **字段清单**：有哪些字段、字段类型（文本/选择/日期/金额/表格等）
- **字段来源**：手动填写 / 接口获取 / 根据其他字段联动带出
- **必填校验**：哪些字段必填，哪些选填
- **联动逻辑**：字段之间的依赖关系（如选择"人才计划"后自动带出"人才经费类型"）

### 2. 数据模型文档（model.md）

- **字段名称对照**：前端字段名（英文驼峰）→ 数据库字段名 → 中文含义
- **数据类型**：string / number / boolean / array 等
- **必填属性**：`required: true/false`
- **子表结构**：表格字段的字段名、类型、列顺序

### 3. 参考图/原型图

- **PC 端布局**：字段排列顺序、表格列顺序、分组方式
- **移动端布局**：字段排列顺序（通常与 PC 端一致）
- **特殊交互**：如特定选项下某些字段置灰/隐藏

### 4. 接口文档（用于 fieldMapping）

- **人员选择器**：接口返回哪些字段（recId, name, department, administrationJob 等）
- **项目选择器**：接口返回哪些字段（projectCode, projectName, fundSourceName 等）
- **数据字典**：下拉选项的 value/label 对应关系

### 5. 已有实现参考

- **同医院同类单据**：相同医院的报销单/事前申请，参考其字段命名风格和组件使用
- **标准配置模板**：`单据配置/` 目录下的通用设置
- **其他医院同类型单据**：看其他医院怎么配的，避免重复踩坑

***

## 二、实施步骤

### 第一步：创建目录结构

```
医院名称/单据类型/单据名称_应用编码/
├── pc/
│   └── form.json                    # PC 端表单配置（核心）
├── mobile/
│   └── form.json                    # 移动端表单配置（次优先级）
├── doc/
│   └── model.md                     # 数据模型（可选）
└── 模板组件/
    └── pc/
        └── 组件名称.json              # PC 端可复用模板组件（推荐优先引用）
```

**示例**：

```
湖南人民医院/事前申请/人才经费使用申请_talentFundsUsageApplication/
├── pc/
│   └── form.json
├── mobile/
│   └── form.json
└── doc/
    └── model.md
```

> **要点**：`模板组件/pc/` 目录存放可被 `$ref` 引用的 PC 端公共组件（如预算项目），优先使用引用而非内联。

### 第二步：搭建 PC 端基础表单框架

#### 2.1 确定表单容器组件

PC 端统一使用 `DtForm`。

#### 2.2 确定基础信息区组件

PC 端使用 `TaxBaseInfo`，包含标题、申请人、科室、申请日期等头部信息。

#### 2.3 编写基础字段

PC 端常用组件：

| 场景 | PC 端组件 | 说明 |
| --- | --------- | ---- |
| 文本输入 | `DtInput` | 通用文本字段 |
| 下拉选择 | `DtSelect` | 有导入/字典场景需同时配置 `options` 和 `enum` |
| 金额输入 | `DtAmountInput` | 带千分位和精度控制 |
| 日期选择 | `DtDatePicker` | 暂存回显需配置 `valueFormat` / `format` |
| 多行文本 | `DtTextarea` | 长文本输入 |
| 地区选择 | `TaxBaseRegionCascader` | 省市区级联选择 |
| 开关 | `DtSwitch` | 布尔值切换 |

> 移动端配置请参考 [pc-mobile-differences.md](pc-mobile-differences.md) 中的组件映射表，在完成 PC 端后按对应关系转换。

**基础字段示例**：

```json
{
  "type": "object",
  "properties": {
    "applicantName": {
      "type": "string",
      "title": "申请人",
      "x-decorator": "FormItem",
      "x-component": "DtInput",
      "x-validator": [{ "required": true, "message": "请输入申请人" }]
    },
    "applyDepartment": {
      "type": "string",
      "title": "科室",
      "x-decorator": "FormItem",
      "x-component": "DtInput"
    }
  }
}
```

### 第三步：配置 PC 端选择器组件

#### 3.1 人员选择器

PC 端使用 `TaxBasePersonTreeTableDialogSelect`，通过 `fieldMapping` 将接口返回字段映射到表单字段。

**fieldMapping 配置示例**：

```json
{
  "applicantId": {
    "type": "string",
    "title": "申请人",
    "x-decorator": "FormItem",
    "x-component": "TaxBasePersonTreeTableDialogSelect",
    "x-component-props": {
      "placeholder": "请选择",
      "fieldMapping": [
        { "type": "value", "sourceField": "recId", "targetField": "applicantId" },
        { "type": "label", "sourceField": "name", "targetField": "applicantName" },
        { "type": "other", "sourceField": "department", "targetField": "applyDepartment" },
        { "type": "other", "sourceField": "administrationJob", "targetField": "dutyName" },
        { "type": "other", "sourceField": "jobTitle", "targetField": "titleName" },
        { "type": "other", "sourceField": "contactTelephone", "targetField": "contactWay" }
      ]
    },
    "x-validator": [{ "required": true, "message": "请选择申请人" }]
  }
}
```

**映射类型说明**：

| type    | 说明             |
| ------- | -------------- |
| `value` | 选择器的实际值（提交时使用） |
| `label` | 选择器的显示文本       |
| `other` | 其他字段，自动填充到表单   |

#### 3.2 项目选择器

PC 端使用 `TaxBaseBudgetProjectDailogSelect`，用于预算项目选择场景。

**fieldMapping 配置示例**：

```json
{
  "budgetProjectId": {
    "type": "string",
    "title": "预算项目",
    "x-decorator": "FormItem",
    "x-component": "TaxBaseBudgetProjectDailogSelect",
    "x-component-props": {
      "placeholder": "请选择",
      "fieldMapping": [
        { "type": "value", "sourceField": "projectId", "targetField": "budgetProjectId" },
        { "type": "label", "sourceField": "projectName", "targetField": "budgetProjectName" },
        { "type": "other", "sourceField": "projectCode", "targetField": "budgetProjectCode" },
        { "type": "other", "sourceField": "fundSourceName", "targetField": "fundSource" }
      ]
    },
    "x-validator": [{ "required": true, "message": "请选择预算项目" }]
  }
}
```

### 第四步：实现字段联动（x-reactions）

#### 4.1 联动逻辑编写

使用 `x-reactions` 实现字段之间的依赖关系：

```json
{
  "字段名": {
    "x-reactions": {
      "dependencies": ["依赖字段1", "依赖字段2"],
      "fulfill": {
        "state": {
          "value": "{{ 表达式 }}",
          "hidden": "{{ 表达式 }}",
          "disabled": "{{ 表达式 }}"
        }
      }
    }
  }
}
```

#### 4.2 常用表达式变量

| 变量          | 说明                           |
| ----------- | ---------------------------- |
| `$self`     | 当前字段                         |
| `$deps`     | 依赖字段数组，`$deps[0]` 为第一个依赖字段的值 |
| `$form`     | 表单实例                         |
| `$values`   | 表单全部数据                       |
| `$userInfo` | 用户上下文信息                      |

#### 4.3 常见联动场景

**场景 1：选择 A 字段 → 自动带出 B 字段值**

```json
{
  "talentFundingType": {
    "type": "string",
    "title": "人才经费类型",
    "x-decorator": "FormItem",
    "x-component": "DtInput",
    "x-component-props": {
      "disabled": true
    },
    "x-reactions": {
      "dependencies": ["talentPlan"],
      "fulfill": {
        "state": {
          "value": "{{$deps[0] ? ($form.getFieldState('talentPlan').dataSource?.find(item => item.value === $deps[0])?.label + '经费') : ''}}"
        }
      }
    }
  }
}
```

**场景 2：选择 A 字段 → B 字段置灰**

```json
{
  "reimburseList": {
    "type": "string",
    "title": "报销清单",
    "x-decorator": "FormItem",
    "x-component": "DtTextarea",
    "x-reactions": {
      "dependencies": ["talentFundsReimburseType"],
      "fulfill": {
        "state": {
          "disabled": "{{['02', '03', '04', '05', '10'].includes($deps[0])}}"
        }
      }
    }
  }
}
```

**场景 3：选择 A 字段 → B 字段显示/隐藏**

```json
{
  "projectDetail": {
    "type": "object",
    "x-decorator": "FormItem",
    "x-component": "TaxBaseProjectInfo",
    "x-reactions": {
      "dependencies": ["reimburseCategory"],
      "fulfill": {
        "state": {
          "hidden": "{{$deps[0] !== '01'}}"
        }
      }
    }
  }
}
```

### 第五步：配置 PC 端表格子表（预算项目）

#### 5.1 方式一：通过 $ref 引用模板组件（推荐）

**高价值实践**：如果当前单据同级目录下有 `模板组件/pc/`，优先通过 `$ref` 引用，避免重复内联。

```json
{
  "budgetItems": {
    "type": "array",
    "title": "预算项目明细",
    "$ref": "#/definitions/TaxBaseProjectInfo_application_budgetItems"
  }
}
```

在 `form.json` 的 `definitions` 中定义：

```json
{
  "definitions": {
    "TaxBaseProjectInfo_application_budgetItems": {
      "type": "array",
      "x-component": "TaxBaseProjectInfo",
      "x-component-props": { ... }
    }
  }
}
```

> **模板组件文件**：当需要跨单据复用组件时，将 definitions 内容提取到 `模板组件/pc/组件名称.json` 文件中。

#### 5.2 方式二：内联配置 TaxBaseProjectInfo

```json
{
  "budgetItems": {
    "type": "array",
    "title": "预算项目明细",
    "x-decorator": "FormItem",
    "x-component": "TaxBaseProjectInfo",
    "x-component-props": {
      "columns": [
        { "dataIndex": "projectCode", "title": "项目编码" },
        { "dataIndex": "projectName", "title": "项目名称" },
        { "dataIndex": "fundSourceName", "title": "资金来源" },
        { "dataIndex": "startTime", "title": "开始时间" },
        { "dataIndex": "endTime", "title": "结束时间" },
        { "dataIndex": "oversightDeptName", "title": "归口科室" },
        { "dataIndex": "fundManagerName", "title": "经费负责人" },
        { "dataIndex": "applicationAmount", "title": "申请金额" }
      ],
      "fieldMapping": [
        { "sourceField": "projectCode", "targetField": "budgetProjectCode" },
        { "sourceField": "projectName", "targetField": "budgetProjectName" }
      ]
    }
  }
}
```

#### 5.3 预算项目常见列配置

| dataIndex | title | 说明 |
| --- | --- | --- |
| `projectCode` | 项目编码 | 预算项目编码 |
| `projectName` | 项目名称 | 需配置 `TaxBaseBudgetProjectDailogSelect` 列 |
| `fundSourceName` | 资金来源 | 自动带出 |
| `oversightDeptName` | 归口科室 | 自动带出 |
| `fundManagerName` | 经费负责人 | 自动带出 |
| `fundBalance` | 可用余额 | 自动带出 |
| `occupyAmt` | 本次申请金额 | 用户手工填写或联动填入 |
| `detailItemAmount` | 明细金额 | 合计列（通常 `x-hidden: true`） |

#### 5.4 预算项目首行自动填充金额

当需要新增预算项目第一行时自动填入费用合计金额时，联动写在**数组根字段**而非行内字段：

```json
"budgetItems": {
  "x-reactions": [
    {
      "dependencies": ["feeDetails#data", "budgetItems"],
      "fulfill": {
        "run": "const list = Array.isArray($self.value) ? $self.value : []; if (list.length === 1) { const total = (Array.isArray($form.values.feeDetails) ? $form.values.feeDetails : []).reduce((sum, item) => sum + (Number(item?.amount) || 0), 0); const raw = list[0]?.occupyAmt; const shouldFill = (raw === undefined || raw === null || raw === '' || Number(raw) === 0) && (Number(raw) !== Number(total)); if (shouldFill) { $form.setValues({ budgetItems: [{ ...(list[0] || {}), occupyAmt: total }] }); } }"
      }
    }
  ]
}
```

### 第六步：校验规则配置

#### 6.1 必填校验

```json
{
  "fieldName": {
    "x-validator": [{ "required": true, "message": "请输入/选择..." }]
  }
}
```

#### 6.2 格式校验

```json
{
  "email": {
    "x-validator": [{ "format": "email", "message": "请输入正确的邮箱格式" }]
  },
  "phone": {
    "x-validator": [{ "pattern": "^1[3-9]\\d{9}$", "message": "请输入正确的手机号" }]
  }
}
```

#### 6.3 自定义校验

```json
{
  "amount": {
    "x-validator": [{
      "validator": "{{ (value) => value > 0 ? undefined : '金额必须大于0' }}"
    }]
  }
}
```

### 第七步：PC 端验证与调试

#### 7.1 JSON 语法验证

确保 `form.json` 格式正确（无多余逗号、括号匹配），可使用 VS Code JSON 格式化检查。

#### 7.2 字段名验证

对照 model.md 检查所有字段名是否一致，确保 fieldMapping 目标字段正确。

#### 7.3 PC 端 UI 精确对标验证（最高优先级）

必须打开用户提供的 PC 端 UI 截图或原型图，进行以下逐项检查：

| 检查项 | 验证内容 | 关键比对点 |
| :--- | :--- | :--- |
| **字段标题** | 检查 `title` 是否与图片完全一致 | 标点符号、括注、单位说明等 |
| **必填标识** | 检查红色星号（\*）标记的字段 | 图片中有星号的必须配置 `required: true` 和 `x-validator` |
| **字段顺序** | 检查 PC 端的展示顺序 | 左右排列、上下层级、分组归类（FieldSet）是否一致 |
| **默认值/占位符** | 检查 `default` 和 `placeholder` | 初始显示的文本、预填的信息是否匹配 |
| **表格列属性** | 检查子表 `columns` 的顺序和标题 | 每一列的标题、宽度比例、对齐方式 |
| **分组标题** | 检查 `DtFormFieldSet` 的标题 | 分组名称是否准确，是否有折叠/展开状态要求 |
| **特殊组件** | 检查组件类型是否匹配 UI 表现 | 如日期范围、金额输入、带单位的输入框等 |
| **label 宽度** | 检查基本信息区域 label 宽度是否一致 | 默认 `100px`，部分需求要求 `110px` |

#### 7.4 联动逻辑验证

检查 x-reactions 中的表达式语法是否正确，且符合需求描述的业务规则。

#### 7.5 PC 端专用验证项

1. **模板组件引用**：使用 `$ref` 引用的模板组件路径和 definitions 名称是否正确
2. **列 prop 唯一性**：`DtEditTable.Column` 的 `prop` 属性必须全局唯一，重复会导致弹窗失效
3. **fieldMapping 一致性**：导入功能中 `excelMappingList` 的字段名与 `fieldMapping` 的 `targetField` 保持一致
4. **日期暂存回显**：`DtDatePicker` 必须配置 `valueFormat` 和 `format` 确保暂存回显正常

***

## 三、PC 端最佳实践

### 3.1 模板组件引用优先原则

**核心原则**：先检查单据同级目录下是否存在 `模板组件/pc/`，存在则优先通过 `$ref` 引用。

```
单据目录/
├── pc/form.json                     # 这里通过 $ref 引用模板
├── 模板组件/pc/组件名称.json          # 模板定义文件
```

引用方式：
```json
"budgetItems": {
  "$ref": "#/definitions/组件名称"
}
```

### 3.2 DtEditTable 列 prop 唯一性原则

`DtEditTable.Column` 的 `prop` 属性必须全局唯一。
- ❌ 两个列绑定相同 `prop` → 选择器无法点击弹窗
- ✅ 保证每列 `prop` 唯一：预算项目选择列绑定 `projectCode`，名称展示列绑定 `projectName`

### 3.3 字段联动位置选择

| 联动类型 | 推荐位置 | 说明 |
| --- | --- | --- |
| 值变化回写（如 A 选值后 B 自动填入） | 目标字段行内 `x-reactions` | 直接在字段上写依赖 |
| 新增行初始化（如预算首行自动带值） | 数组根字段 `x-reactions` + `run` | 行内联动在新增行时不触发 |
| 列头变更联动 | `DtEditTable.Column` 的 `componentProps.title` | dependencies 用根路径写法（如 `.fieldName`） |

### 3.4 label 宽度规范

基本信息区域的 label 宽度需统一：
- **默认宽度**：`100px`
- **较大宽度**：`110px`（部分业务需求）
- 在 `x-component-props` 的 `labelWidth` 或外层 `DtFormFieldSet` 上统一设置

### 3.5 字典字段配置规范

下拉选择器涉及数据字典导入时：
1. 使用 `x-data` 声明字典编码
2. 同时配置 `options` 和 `enum`，避免导入场景下拉数据缺失
3. DtSelect 适用于 PC 端，DtFNutActionSheet 适用于移动端

### 3.6 日期字段暂存回显

```json
"x-component-props": {
  "dateType": "date",
  "valueFormat": "yyyy-MM-dd",
  "format": "yyyy-MM-dd"
}
```

缺少格式声明会导致暂存后回显不显示。

### 3.7 导入功能配置要点

开启 `DtEditTable` 的 Import 功能时：
- `x-component-props` 需包含 `params` 包含 `certCode` 和 `certDetailCode`
- `excelMappingList` 的字段名与 `fieldMapping` 的 `targetField` 保持一致

### 3.8 联动表达式常用模式

| 场景 | 表达式 |
| --- | --- |
| 空值安全 | `{{$deps[0] ? ... : ''}}` |
| 动态数据源取值 | `{{$form.getFieldState('fieldName').dataSource?.find(item => item.value === $deps[0])?.label}}` |
| 天数计算 | `{{dayjs($deps[0][1]).diff(dayjs($deps[0][0]), 'day') + 1}}` |
| 移动端天数（同字段名） | `DATEDIFF($deps[0][0], $deps[0][1]) + 1` |

***

## 四、常见坑点（PC 端）

| 坑点 | 说明 | 解决方案 |
| --- | --- | --- |
| 字段名不一致 | 前端字段名与数据库字段名不匹配 | 严格对照 model.md 校正 |
| 联动不生效 | x-reactions 表达式写错 | 使用 `$form.getFieldState()` 动态获取，避免硬编码 |
| fieldMapping 字段名错误 | 接口返回字段名与 targetField 不匹配 | 确认接口文档中的字段名 |
| 表格列顺序不对 | 与参考图不一致 | 按 columns 数组顺序排列 |
| 必填项遗漏 | 用户提交时报错 | 对照 model.md 逐一检查 required 属性 |
| 数据源获取失败 | 使用 `$self.dataSource` 在非下拉组件中无效 | 使用 `$form.getFieldState('fieldName').dataSource` |
| 空值判断缺失 | 联动时未判断依赖字段是否有值 | 使用 `$deps[0] ? ... : ''` 进行非空判断 |
| 模板引用路径错 | `$ref` 路径或 definitions 名称拼写错误 | 检查 definitions 中的组件名是否一致 |
| 列 prop 重复 | 两个 Column 绑定相同 prop | 确保每列 prop 全局唯一 |

***

## 五、核心原则

1. **先查模板再动手**：检查 `模板组件/pc/` 目录，优先 `$ref` 引用
2. **字段名严格对齐**：以 model.md 为准，不要自己发明字段名
3. **联动逻辑要动态**：用 `$form.getFieldState()` 获取数据源，不要硬编码
4. **先 PC 后移动端**：完成 PC 端 schema 后再转换移动端，组件按映射表替换
5. **验证 JSON 格式**：格式错误会导致表单无法加载
6. **UI 截图即法律**：必须逐项比对 UI 截图，确认标题、顺序、必填标识

***

## 六、工作流程速查

```
需求确认 → 查看参考 → 检查模板 → 创建目录 → 基础框架 → 选择器配置 → 联动实现 → 表格配置 → 校验规则 → 验证调试
```

| 步骤 | 主要任务 | 产出物 |
| --- | --- | --- |
| 1. 需求确认 | 了解表单用途、字段、联动逻辑 | 需求文档 |
| 2. 查看参考 | 找同类单据 + 检查模板组件 | 参考模板 |
| 3. 创建目录 | 建立 pc/mobile/doc 目录结构 | 目录结构 |
| 4. 基础框架 | 配置表单容器和基础字段 | form.json 骨架 |
| 5. 选择器配置 | 配置人员/项目选择器的 fieldMapping | 完整字段定义 |
| 6. 联动实现 | 使用 x-reactions 实现字段联动 | 联动逻辑 |
| 7. 表格配置 | 配置预算项目表格子表（优先 $ref 引用） | 表格组件 |
| 8. 校验规则 | 配置必填、格式、自定义校验 | 校验规则 |
| 9. 验证调试 | JSON 语法、字段名、联动逻辑检查 | 可用表单 |

