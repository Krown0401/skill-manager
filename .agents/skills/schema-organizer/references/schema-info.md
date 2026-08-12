# Schema 结构与分类参考

## Schema 类型分类

### 1. 事前申请类 (事前申请)
- 会议培训申请 (`holdMeetingApplicationForm`, `holdTrainingApplicationForm`)
- 公务接待申请 (`officialReceptionList`)
- 差旅出国申请 (`businessTripApplicationForm`, `shortAbroadBusinessReimburseForm`)
- 劳务经费申请 (`laborFeePayment`)
- 特殊事项审批 (`businessTravelApproval`, `businessTripSpecialApproval`)

### 2.报销单据类 (报销单据)
- 会议培训报销 (`holdMeetingReimburseForm`, `holdTrainingReimburseForm`)
- 公务接待报销 (`officialReceptionReimburseForm`)
- 差旅报销 (`generalTravelReimburseForm`, `scientificResearchTravelForm`)
- 劳务科研报销 (`laborFeeReimburseForm`, `projectLaborFeeReimburseForm`)
- 日常专项报销 (`dailyFundReimburseForm`, `partyBuildingReimburseForm`)

### 3. 资金单据类 (资金单据)
- 借款单 (`hxLoanBill`)
- 退款单 (`hnzfRefundBill`)
- 预付单 (`hnzfPrepaidOrder`)
- 还款单 (`repaymentBill`)

### 4. 模板组件 (模板组件)
- 基础信息组件 (`TaxBaseInfo`, `RsBaseInfo`)
- 费用明细组件 (`TaxBaseFeeReceipt`, `RsBaseFeeReceipt`)
- 项目信息组件 (`TaxBaseProjectInfo`, `RsBaseProjectInfo`)
- 支付信息组件 (`paymentInfo`)
- 核销信息组件 (`writeOffLoanInfo`)

## Schema 结构解析

### 核心字段属性

```json
{
  "name": "fieldName",           // 字段名称
  "title": "字段标题",            // 显示标题
  "type": "string|number|array|object|void",  // 数据类型
  "x-component": "DtInput",      // 渲染组件
  "x-decorator": "FormItem",     // 布局包装器
  "x-validator": [],             // 校验规则
  "x-reactions": [],             // 联动逻辑
  "x-component-props": {},       // 组件属性
  "x-editable": true,            // 是否可编辑
  "x-hidden": false,             // 是否隐藏
  "required": false              // 是否必填
}
```

### 常用组件类型

| 组件前缀 | 说明 | 示例 |
|---------|------|------|
| `Dt*` | 基础组件 | `DtInput`, `DtSelect`, `DtDatePicker`, `DtNumber` |
| `Tax*` | 税务定制组件 | `TaxBaseInfo`, `TaxBasePersonTreeTableDialogSelect` |
| `Rs*` | 人事定制组件 | `RsBaseProjectInfo`, `RsBaseFeeReceipt` |
| `Cert*` | 凭证组件 | `CertBillNo` (单据编号) |
