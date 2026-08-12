# PC 端组件速查手册

本文档以 **PC 端组件为核心**，详细列出各组件的用途和关键属性。移动端组件仅作对照参考。

> **使用原则**：先确定 PC 端组件，需要移动端时按对照表替换。

## PC 端组件一览（核心）

| 组件名称 | 用途 | 关键属性 |
| --- | --- | --- |
| `DtForm` | 表单容器 | - |
| `TaxBaseInfo` | 基础信息区（标题、申请人、科室等） | 位于 _header 区域 |
| `DtInput` | 文本输入 | `placeholder`, `maxLength` |
| `DtTextarea` | 多行文本输入 | `placeholder`, `maxLength`, `rows` |
| `DtSelect` | 下拉选择器 | `placeholder`, `options`(enum), `allowClear`；**有导入/字典时需同时配 options 和 enum** |
| `DtAmountInput` | 金额输入 | `placeholder`, `precision`, `max`, `min` |
| `DtDatePicker` | 日期选择 | `dateType`, `placeholder`, `valueFormat`, `format` |
| `DtSwitch` | 开关 | `checkedChildren`, `unCheckedChildren`, `defaultChecked` |
| `TaxBasePersonTreeTableDialogSelect` | 人员选择器（弹窗） | `placeholder`, `fieldMapping` |
| `TaxBaseBudgetProjectDailogSelect` | 预算项目选择器（弹窗） | `placeholder`, `fieldMapping` |
| `TaxBaseRegionCascader` | 省市区级联选择 | `placeholder`, `fieldMapping` |
| `TaxFeeDetailCard` | 费用明细卡片 | `expenseType` |
| `TaxPreApproalFeeInfoCard` | 事前申请费用明细卡片 | `expenseType` |
| `TaxBaseProjectInfo` | 预算项目表格子表 | `columns`, `fieldMapping`, `showSummary` |
| `DtFormFieldSet` | 分组/区块标题 | `title`, `collapsible` |
| `DtEditTable` | 可编辑表格 | `columns`, `showSummary`, `importConfig` |

## PC 端组件属性详解

### DtSelect（下拉选择器）

```json
{
  "x-component": "DtSelect",
  "x-component-props": {
    "placeholder": "请选择",
    "allowClear": true,
    "options": [
      { "label": "选项1", "value": "01" },
      { "label": "选项2", "value": "02" }
    ]
  }
}
```

> **注意**：涉及数据字典导入时，必须同时配 `options` 和 `enum`，并在 `x-data` 中声明字典编码。

### TaxBasePersonTreeTableDialogSelect（人员选择器）

```json
{
  "x-component": "TaxBasePersonTreeTableDialogSelect",
  "x-component-props": {
    "placeholder": "请选择人员",
    "fieldMapping": [
      { "type": "value", "sourceField": "recId", "targetField": "userId" },
      { "type": "label", "sourceField": "name", "targetField": "userName" },
      { "type": "other", "sourceField": "department", "targetField": "deptName" }
    ]
  }
}
```

> **fieldMapping 类型**：`value`(实际值)、`label`(显示文本)、`other`(自动填充)。

### TaxBaseBudgetProjectDailogSelect（预算项目选择器）

```json
{
  "x-component": "TaxBaseBudgetProjectDailogSelect",
  "x-component-props": {
    "placeholder": "请选择预算项目",
    "fieldMapping": [
      { "type": "value", "sourceField": "projectId", "targetField": "budgetProjectId" },
      { "type": "label", "sourceField": "projectName", "targetField": "budgetProjectName" },
      { "type": "other", "sourceField": "projectCode", "targetField": "budgetProjectCode" }
    ]
  }
}
```

### TaxBaseProjectInfo（预算项目表格子表）

```json
{
  "x-component": "TaxBaseProjectInfo",
  "x-component-props": {
    "columns": [
      { "dataIndex": "projectCode", "title": "项目编码" },
      { "dataIndex": "projectName", "title": "项目名称" },
      { "dataIndex": "occupyAmt", "title": "本次申请金额" }
    ],
    "fieldMapping": [
      { "sourceField": "projectCode", "targetField": "budgetProjectCode" },
      { "sourceField": "projectName", "targetField": "budgetProjectName" }
    ]
  }
}
```

> **最佳实践**：预算项目优先通过 `$ref` 引用模板组件（见 guide.md 的模板组件引用优先原则）。

### DtDatePicker（日期选择器）

```json
{
  "x-component": "DtDatePicker",
  "x-component-props": {
    "dateType": "date",
    "placeholder": "请选择日期",
    "valueFormat": "yyyy-MM-dd",
    "format": "yyyy-MM-dd"
  }
}
```

> **重要**：必须配置 `valueFormat` 和 `format`，否则暂存后回显不显示。

### DtFormFieldSet（分组标题）

```json
{
  "type": "void",
  "x-component": "DtFormFieldSet",
  "x-component-props": {
    "title": "基本信息"
  }
}
```

## 移动端组件对照表（辅助参考）

> 仅在需要同步移动端时查阅。先完成 PC 端 schema，再按此表转换。

| PC 端组件 | 移动端对应组件 |
| --- | --- |
| `DtForm` | `DtFNutForm` |
| `DtInput` | `DtFNutInput` |
| `DtTextarea` | `DtFNutTextarea` |
| `DtSelect` | `DtFNutActionSheet` |
| `DtAmountInput` | `DtFNutInputNumber` |
| `DtDatePicker` | `DtFNutDatePicker` |
| `DtSwitch` | `DtFNutSwitch` |
| `TaxBaseInfo` | `RsBusTripInfo` |
| `TaxBasePersonTreeTableDialogSelect` | `RsPersonSelect` |
| `TaxBaseBudgetProjectDailogSelect` | `RsProjectSelect` |
| `TaxBaseProjectInfo` | `RsProjectInfo` / `RsPreBaseEdit` |
| `TaxFeeDetailCard` | `RsReimbExpenseCard` |

## 组件通用属性

| 属性 | 说明 | 示例 |
| --- | --- | --- |
| `x-decorator` | 装饰器类型，通常为 `FormItem` | `"FormItem"` |
| `x-component` | 组件类型 | `"DtInput"` |
| `x-component-props` | 组件属性 | `{ "placeholder": "请输入" }` |
| `x-validator` | 校验规则 | `[{ "required": true, "message": "必填" }]` |
| `x-reactions` | 字段联动 | 见 guide.md 联动配置 |
| `x-hidden` | 隐藏字段 | `true` |
| `default` | 默认值 | `"默认值"` |
