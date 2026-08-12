# Formily 配置经验记录

本文档记录从实际配置中总结的经验教训，持续更新。

---

## 经验记录模板

每次完成配置后，按以下格式追加记录：

````markdown
## [日期] [单据名称] - [医院名称]

### 配置概要

- 应用编码：
- 单据类型：
- PC/移动端：

### 关键实现

#### 1. [功能点名称]

**场景**：...
**实现方案**：...
**关键代码**：

```json
// 代码示例
```
````

**注意事项**：...

### 踩坑记录

| 坑点 | 解决方案 |
| ---- | -------- |
| ...  | ...      |

### 经验总结

- ...

````

---

## 已记录经验

## 2026-04-24 人才经费使用申请 - 湖南人民医院

### 配置概要
- 应用编码：talentFundsUsageApplication
- 单据类型：事前申请
- PC/移动端：PC + 移动端

### 关键实现

#### 1. 人才经费类型联动
**场景**：选择人才计划后自动带出人才经费类型（"计划名+经费"）
**实现方案**：使用 `$form.getFieldState()` 动态获取数据源，避免硬编码
**关键代码**：

PC 端：
```json
"talentFundingType": {
  "type": "string",
  "title": "人才经费类型",
  "x-decorator": "FormItem",
  "x-component": "DtInput",
  "x-component-props": { "disabled": true },
  "x-reactions": {
    "dependencies": ["talentPlan"],
    "fulfill": {
      "state": {
        "value": "{{$deps[0] ? ($form.getFieldState('talentPlan').dataSource?.find(item => item.value === $deps[0])?.label + '经费') : ''}}"
      }
    }
  }
}
````

移动端（`label` 改为 `text`）：

```json
"value": "{{$deps[0] ? ($form.getFieldState('talentPlan').dataSource?.find(item => item.value === $deps[0])?.text + '经费') : ''}}"
```

**注意事项**：

- 移动端数据源的显示字段可能是 `text` 而不是 `label`
- 需要添加空值判断 `$deps[0] ? ... : ''`，否则无选择时显示 undefined

#### 2. 报销类别联动置灰

**场景**：特定报销类别下，科研项目类别和报销清单置灰
**关键代码**：

```json
"scienProjCategory": {
  "x-reactions": {
    "dependencies": ["talentFundsReimburseType"],
    "fulfill": {
      "state": {
        "disabled": "{{['02', '03', '04', '05', '10'].includes($deps[0])}}"
      }
    }
  }
}
```

#### 3. 人员选择器 fieldMapping

**场景**：人员选择后自动填充科室、院区、职务、职称、联系电话
**关键代码**：

```json
"applicantId": {
  "x-component": "TaxBasePersonTreeTableDialogSelect",
  "x-component-props": {
    "fieldMapping": [
      { "type": "value", "sourceField": "recId", "targetField": "applicantId" },
      { "type": "label", "sourceField": "name", "targetField": "applicantName" },
      { "type": "other", "sourceField": "department", "targetField": "belongAcademy" },
      { "type": "other", "sourceField": "administrationJob", "targetField": "dutyName" },
      { "type": "other", "sourceField": "jobTitle", "targetField": "titleName" },
      { "type": "other", "sourceField": "contactTelephone", "targetField": "contactWay" }
    ]
  }
}
```

### 踩坑记录

| 坑点                     | 解决方案                                                |
| ------------------------ | ------------------------------------------------------- |
| 硬编码联动逻辑           | 使用 `$form.getFieldState()` 动态获取数据源             |
| 空值导致显示 undefined   | 添加三元运算符判断 `$deps[0] ? ... : ''`                |
| 移动端组件用错           | PC 端组件在移动端不兼容，需使用 `DtFNut*` 或 `Rs*` 系列 |
| 移动端数据源字段名不同   | 移动端可能用 `text` 而不是 `label`                      |
| 字段名与 model.md 不一致 | 严格对照 model.md 校正字段名                            |
| AI 臆测字段名           | 禁止 AI 自行编写英文名，必须参考已有单据，不确定则询问用户 |
| "x-hidden": true会被移除 | 不能移除                                                |

### 经验总结

- 联动逻辑避免硬编码，使用 `$form.getFieldState()` 动态获取数据源
- 使用可选链操作符 `?.` 进行安全访问
- 添加空值判断防止 undefined
- PC 和移动端数据源结构可能不同（`label` vs `text`）
- 字段名称严格以 model.md 为准
- 选择器配置 fieldMapping 时确认接口返回的字段名
- "x-hidden": true 的字段是很重要的必须保留不能移除
- **字段命名红线**：**绝对禁止 AI 自行编写或臆测字段英文名**。必须严格以项目中已存在的字段名为准（参考同院区或其他院区的同类单据）。如果遇到无法确定命名的字段，必须立即反馈并询问用户，不得随意命名。
- **UI 对标验证**：必须将生成的 schema 与 UI 截图逐一比对，特别是必填标识（\*）和字段标题的准确性。

---

## 2026-04-24 国内进修申请 - 湖南人民医院

### 配置概要

- 应用编码：domesticStudyApplication
- 单据类型：事前申请
- PC/移动端：PC + 移动端

### 关键实现

#### 1. UI 精确对标验证实例

**场景**：根据需求图片验证字段完整性
**实现结果**：

- **必填项验证**：发现图片中“紧急联系人”和“紧急联系人电话”有星号，但在初始 model.md 中未标明必填。最终在 schema 中增加了 `required: true`。
- **标题对标**：图片显示为“回院后拟开展的新技术、新项目”，而华西模板是“回院后工作计划”，已按图片修改 `title`。
- **字段顺序**：按图片调整了“进修人”、“科室”、“人员类别”、“身份证号”的排列顺序。

#### 2. 进修天数自动计算

**场景**：选择进修开始和结束日期后，自动计算天数
**关键代码**：

```json
"studydays": {
  "x-reactions": {
    "dependencies": ["[studyStartDate,studyEndDate]"],
    "fulfill": {
      "state": {
        "value": "{{$deps[0]?.[0] && $deps[0]?.[1] ? dayjs($deps[0][1]).diff(dayjs($deps[0][0]), 'day') + 1 : undefined}}"
      }
    }
  }
}
```

### 经验总结

- **图片即法律**：当需求文档与图片不一致时，优先遵循图片展示的样式和必填规则。
- **细节对标**：检查图片中的每一个字段标题，确保与 schema 的 `title` 完全一致。
- **跨端一致性**：PC 端修改了标题或必填属性后，务必同步更新移动端。

---

## 2026-04-28 视频拍摄制作申请 - 湖南职防院

### 配置概要

- 应用编码：videoProductionApply
- 单据类型：事前申请
- PC/移动端：PC（本次处理）

### 关键实现

#### 1. 预算项目首行自动带入费用明细合计

**场景**：用户新增预算项目第 1 行时，“本次申请金额(occupyAmt)”应自动等于“费用明细”合计。  
**问题表现**：仅在 `occupyAmt` 行内写 `x-reactions` 时，新增首行场景经常不触发，金额停留 `0.00`。  
**实现方案**：把联动放到 `budgetItems` 数组根节点，使用 `run + $form.setValues` 强制兜底，监听 `feeDetails#data` 与 `budgetItems`。  
**关键代码**：

```json
"x-reactions": [
  {
    "dependencies": ["feeDetails#data", "budgetItems"],
    "fulfill": {
      "run": "const list = Array.isArray($self.value) ? $self.value : []; if (list.length === 1) { const total = (Array.isArray($form.values.feeDetails) ? $form.values.feeDetails : []).reduce((sum, item) => sum + (Number(item?.amount) || 0), 0); const raw = list[0]?.occupyAmt; const shouldFill = (raw === undefined || raw === null || raw === '' || Number(raw) === 0) && (Number(raw) !== Number(total)); if (shouldFill) { $form.setValues({ budgetItems: [{ ...(list[0] || {}), occupyAmt: total }] }); } }"
    }
  }
]
```

**注意事项**：

- 行内字段联动适合“值变化回写”，不适合“新增首行初始化”这类时机敏感场景。
- 新增首行自动填充要加“仅首行 + 原值为空/0 才覆盖”的保护，避免覆盖用户已录入金额。

#### 2. 申请日期暂存回显为空修复

**场景**：暂存后回显时“申请日期”不显示。  
**实现方案**：给 `DtDatePicker` 补齐 `dateType/valueFormat/format`，并统一默认值格式。  
**关键代码**：

```json
"x-component-props": {
  "disabled": true,
  "dateType": "date",
  "valueFormat": "yyyy-MM-dd",
  "format": "yyyy-MM-dd"
},
"default": "{{dayjs().format('YYYY-MM-DD')}}"
```

### 踩坑记录

| 坑点                                          | 解决方案                                               |
| --------------------------------------------- | ------------------------------------------------------ |
| `occupyAmt` 放在行内 reaction，新增首行不触发 | 上移到 `budgetItems` 数组根节点，用 `run` 主动写值     |
| `DatePicker` 未声明格式导致回显丢失           | 明确 `dateType/valueFormat/format`，统一日期字符串格式 |

### 经验总结

- 预算表“新增首行自动带值”优先使用**数组根级联动**而非行内联动。
- 需要保证用户手工输入优先级，自动填充值仅做“空值兜底”。
- 日期字段涉及暂存回显时，`DtDatePicker` 必须显式声明格式，避免隐式解析失败。

---

## 2026-04-29 移动端 schema 补全（短期培训考察申请 + 专项经费使用申请）- 湖南人民医院

### 配置概要

- **短期培训考察申请**：shortTrainingApply / 事前申请 / 移动端
- **专项经费使用申请**：specialFundsApply / 事前申请 / 移动端

### 关键实现

#### 1. 参考 PC 端字段补全移动端 schema

**场景**：移动端 `mobile/form.json` 缺失，需要基于同单据 PC 端字段生成对应的移动端配置。
**实现方案**：

1. **字段对齐**：逐条比对 PC 端字段，确保移动端字段名、必填属性、默认值与 PC 端一致
2. **组件映射**：按 `components.md` 对照表将 PC 组件映射为移动端组件
3. **联动逻辑同步**：PC 端的 `x-reactions` 需要改写为移动端表达式（如 `dayjs().diff()` → `DATEDIFF()`）

**关键组件映射**：

| PC 端组件                            | 移动端组件               | 适用场景                 |
| ------------------------------------ | ------------------------ | ------------------------ |
| `DtForm`                             | `DtFNutForm`             | 表单容器                 |
| `TaxBasePersonTreeTableDialogSelect` | `RsPersonSelect`         | 人员选择                 |
| `DtSelect` (dict)                    | `DtFNutActionSheet`      | 下拉选择                 |
| `DtDatePicker`                       | `DtFNutDatePicker`       | 日期选择                 |
| `DtInput` (disabled)                 | `DtFNutInput` (readonly) | 只读展示                 |
| `DtAmountInput`                      | `DtFNutInputNumber`      | 金额输入                 |
| `TaxBaseRegionCascader`              | `RsAddress`              | 地区选择                 |
| `DatePicker` (daterange)             | `DtFNutCalendar` (range) | 日期范围                 |
| `TaxBaseProjectInfo`                 | `RsPreBaseEdit`          | 预算项目表格（事前申请） |
| `TaxPreFeeStandardTable`             | `RsReimbExpenseCard`     | 出差人员表格             |
| `TaxBaseRelatedVouchersCard`         | `RsFileUploadGroup`      | 附件上传                 |

#### 2. 移动端标准结构

```json
{
  "type": "void",
  "x-component": "DtFNutForm",
  "x-component-props": { "group": false },
  "properties": {
    "recId": { "x-hidden": true, ... },
    "_header": { "x-component": "RsBusTripInfo", ... },
    "_collapse": { "x-component": "DtFNutCellGroup", ... },
    "_attrTab_": { "x-component": "DtFNutFormTab", ... },
    "footer": { "x-component": "PreGroupBtns", ... }
  }
}
```

#### 3. 模板组件优先引用原则

**场景**：同医院同类型单据（如报销单据）下通常存在 `模板组件` 文件夹，内含标准化的 schema 片段（如预算项目、收款信息、冲销借款等）。

**引用方式**：

- PC 端模板存放在 `模板组件/pc/*.json`
- 移动端模板存放在 `模板组件/mobile/*.json`
- 单据 schema 中通过 `"$ref": "#/definitions/模板文件名（不含扩展名）"` 引用

**示例**：

```json
// 报销单据 PC 端引用预算项目模板
"projectInfo": {
  "$ref": "#/definitions/TaxBaseProjectInfo_reimburse_projectInfo"
},
"paymentInfo": {
  "$ref": "#/definitions/TaxBaseFeeReceipt_reimburse_paymentInfo"
}

// 报销单据移动端引用对应模板
"budgetItems": {
  "$ref": "#/definitions/RsBaseProjectInfo_reimburse_projectInfo"
}
```

**注意事项**：

- 生成 schema 时，先检查当前单据目录下是否存在 `模板组件` 文件夹
- 若存在，优先使用 `$ref` 引用模板，避免直接内联定义，确保与医院标准保持一致
- 若不存在（如多数事前申请），则按需手动配置内联字段
- 移动端模板与 PC 端模板字段名可能不同，需按端对应引用

### 踩坑记录

| 坑点                                                      | 解决方案                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 移动端缺少 `hospitalAreaName`（院区）                     | 参考 PC 端 subTitle，在移动端 `_header.subTitle` 中补全                                                             |
| 移动端日期联动表达式语法不同                              | PC 端用 `dayjs($deps[0][1]).diff(dayjs($deps[0][0]), 'day') + 1`，移动端用 `DATEDIFF($deps[0][0], $deps[0][1]) + 1` |
| `tripStaffs` 默认数据字段不全                             | 需与 PC 端 `fieldMapping` 对齐，确保所有映射字段都有默认值                                                          |
| 移动端 `DtFNutActionSheet` 的 enum 用 `text` 而非 `label` | 移动端数据源显示字段为 `text`，PC 端为 `label`                                                                      |
| 事前申请通常无模板组件                                    | 直接内联配置预算项目（`RsPreBaseEdit`），报销单据优先检查模板组件                                                   |

### 经验总结

- **先查模板再动手**：生成 schema 前，优先检查同单据目录下是否有 `模板组件` 文件夹，有则使用 `$ref` 引用
- **PC 与移动端字段名保持一致**：特别是 `fieldMapping` 中的 `targetField`，确保两端提交的数据结构一致
- **默认值完整**：移动端 `tripStaffs`、`applicantId` 等选择器的 `default` 需包含所有 `fieldMapping` 映射字段
- **联动表达式分端处理**：PC 端用 `dayjs`，移动端用 `DATEDIFF` / `DATETOSTR` 等移动端内置函数

---

## 2026-05-10 国外进修报销单 - 湖南人民医院

### 配置概要

- 应用编码：abroadRefresherTrainingReimburseForm
- 单据类型：报销单
- PC/移动端：PC + 移动端

### 关键实现

#### 1. 预算类别与归口科室联动

**场景**：根据经费来源是否包含特定的 code ('90501')，动态控制“预算类别”和“预算归口科室”的显隐、置灰与必填。
**实现方案**：在 `baseInfoExtendEle` 下定义字段，并使用 `x-reactions` 监听 `fundingSourceCode`。

PC 端实现：
```json
"budgetCategory": {
  "type": "string",
  "title": "预算类别",
  "x-decorator": "FormItem",
  "x-component": "DtSelect",
  "x-reactions": [
    {
      "dependencies": [".fundingSourceCode"],
      "when": "{{$deps[0]?.includes('90501')}}",
      "fulfill": {
        "schema": {
          "x-validator": [{ "required": true, "message": "请选择预算类别" }],
          "x-disabled": false,
          "x-hidden": false
        }
      },
      "otherwise": {
        "schema": {
          "x-validator": [],
          "x-disabled": true,
          "x-hidden": true
        },
        "state": { "value": null }
      }
    }
  ]
}
```

移动端实现（使用 `target` 批量控制）：
```json
{
  "target": [
    "basicInfo.baseInfoExtendEle.oversightDeptId",
    "basicInfo.baseInfoExtendEle.budgetCategory"
  ],
  "effects": ["onFieldValueChange", "onFieldMount"],
  "when": "{{OR($self.value[0]=='90501', $self.value[1]=='90501')}}",
  "fulfill": {
    "schema": {
      "x-validator": [{ "required": true, "message": "必填" }],
      "x-component-props.disabled": false,
      "x-hidden": false
    }
  },
  "otherwise": {
    "schema": {
      "x-validator": [],
      "x-component-props.disabled": true,
      "x-hidden": true
    },
    "state": { "value": null }
  }
}
```

#### 2. 字段映射精确化 (oversightDeptName)

**场景**：需求明确要求增加 `oversightDeptName` 字段。
**实现方案**：在 `oversightDeptId` 选择器的 `fieldMapping` 中显式指定映射目标。

```json
"fieldMapping": [
  { "sourceField": "deptName", "targetField": "oversightDeptName", "type": "label" },
  { "sourceField": "recId", "targetField": "oversightDeptId", "type": "value" }
]
```

### 经验总结

- **联动逻辑复用**：当多个字段具有相同的联动条件时，移动端推荐使用 `target` 数组进行统一控制，减少冗余代码。
- **显隐与必填同步**：联动控制时，通常需要同时处理 `x-hidden`、`x-validator` (必填) 和 `x-disabled`，确保 UI 逻辑闭环。
- **尊重特定字段要求**：如果需求文档指明了具体的字段名（如 `oversightDeptName`），即使该信息在其他地方有冗余，也应在 `fieldMapping` 中予以落实。
