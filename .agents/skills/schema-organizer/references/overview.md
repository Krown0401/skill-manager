# 全院区 Schema 配置总览

本文档提供所有院区 Formily 表单 schema 配置的完整概览。

---

## 📊 院区分布统计

### 院区列表

| 序号 | 院区名称 | 事前申请 | 报销单据 | 资金单据 | 合计 |
|------|---------|---------|---------|---------|------|
| 1 | 华西医院 | 12 | 26 | 2 | 40 |
| 2 | 医大一 | 2 | 16 | 0 | 18 |
| 3 | 湖南人民医院 | 0 | 15 | 0 | 15 |
| 4 | 自贡四院 | 4 | 15 | 2 | 21 |
| 5 | 重庆中医院 | 5 | 13 | 2 | 20 |
| 6 | 福建人民医院 | 0 | 16 | 0 | 16 |
| 7 | 成都高新区妇女儿童医院 | 5 | 3 | 1 | 9 |
| 8 | 江西妇幼 | 0 | 0 | 2 | 2 |
| 9 | 湖南职防院 | 17 | 21 | 3 | 41 |
| 10 | 华西实施 | 2 | 2 | 0 | 4 |
| **总计** | **10 个院区** | **47** | **127** | **12** | **186** |

> 注：数据统计于 2026-03-25，不包含模板组件和运营配置

---

## 🏥 各院区详细配置

### 1. 华西医院 (West China Hospital)

**院区特点**: 配置最完善，单据类型最全

#### 事前申请 (12 个)
- ✅ 举办会议申请单 (`holdMeetingApplicationForm`)
- ✅ 举办培训申请单 (`holdTrainingApplicationForm`)
- ✅ 人才培养专项出国境基金参会申请单 (`talentOverseasFundMeetingApply`)
- ✅ 党建活动经费申请 (`partyActivityFund`)
- ✅ 公务接待清单 (`officialReceptionList`)
- ✅ 出差特殊要素审批表 (`businessTripSpecialApproval`)
- ✅ 出差申请单 (`businessTripApplicationForm`)
- ✅ 国内进修申请 (`domesticStudyApplication`)
- ✅ 国外进修申请 (`overseasStudyApplication`)
- ✅ 外宾来访申请 (`foreignGuestVisitApplication`)
- ✅ 院内劳务费发放表 (`inHospitalLaborFeePayment`)
- ✅ 院外劳务费发放表 (`outHospitalLaborFeePayment`)

#### 报销单据 (26 个)
- ✅ 举办会议报销单 (`holdMeetingReimburseForm`)
- ✅ 举办培训报销单 (`holdTrainingReimburseForm`)
- ✅ 党建活动经费报销单 (`partyBuildingReimburseForm`)
- ✅ 党务活动经费报销单 (`partyActivityFundsReimburseForm`)
- ✅ 公务接待报销单 (`officialReceptionReimburseForm`)
- ✅ 其他日常经费报销单 (`dailyFundReimburseForm`)
- ✅ 其他人力费用报销单 (`otherHrFeeReimburseForm`)
- ✅ 人力资源报销单 (`humanResourcesReimburseForm`)
- ✅ 劳务费报销单 (`laborFeeReimburseForm`)
- ✅ 国内进修报销单 (`refresherTrainingReimburseForm`)
- ✅ 国外进修报销单 (`abroadRefresherTrainingReimburseForm`)
- ✅ 国际合作与交流费报销 (`internationalCooperationReimburseForm`)
- ✅ 工会文体协会经费报销单 (`tradeUnionActivReimburseForm`)
- ✅ 文章版面费报销单 (`articleFeeReimburseForm`)
- ✅ 日常差旅报销单 (`generalTravelReimburseForm`)
- ✅ 科研差旅报销单 (`scientificResearchTravelForm`)
- ✅ 科研经费报销单 (`scientificResearchForm`)
- ✅ 晚霞关爱基金报销单 (`pensionReimburseForm`)
- ✅ 短期因公出国报销单 (`shortAbroadBusinessReimburseForm`)
- ✅ 研究生生活补助报销单 (`livingAllowanceReimburseForm`)
- ✅ 材料费报销单 (`materialCostReimburseForm`)
- ✅ 测试化验加工费报销单 (`testAssayProcessingReimburseForm`)
- ✅ 房屋修缮报销单 (`houseRepairReimburseForm`)
- ✅ 维修维护报销单 (`maintenanceReimburseForm`)
- ✅ 采购报销单 (`purchaseReimburseForm`)
- ✅ 通用报销单 (`generalReimburseForm`)

#### 资金单据 (2 个)
- ✅ 借款单 (`hxLoanBill`)
- ✅ 还款单 (`repaymentBill`)

#### 特色配置
- 使用 `Tax*` 系列定制组件
- 完整的模板组件体系
- 复杂的联动逻辑和校验规则

---

### 2. 医大一 (First Affiliated Hospital)

**院区特点**: 简化配置，侧重核心功能

#### 事前申请 (2 个)
- ✅ 因公出差审批表 (`businessTravelApproval`)
- ✅ 模板组件库

#### 报销单据 (16 个)
- ✅ 举办会议报销单 (`holdMeetingReimburseForm`)
- ✅ 举办培训报销单 (`holdTrainingReimburseForm`)
- ✅ 党建活动经费报销单 (`partyBuildingReimburseForm`)
- ✅ 公务接待报销单 (`officialReceptionReimburseForm`)
- ✅ 其他日常经费报销单 (`dailyFundReimburseForm`)
- ✅ 劳务费报销单 (`laborFeeReimburseForm`)
- ✅ 国内进修报销单 (`refresherTrainingReimburseForm`)
- ✅ 国外进修报销单 (`abroadRefresherTrainingReimburseForm`)
- ✅ 工会文体协会经费报销单 (`tradeUnionActivReimburseForm`)
- ✅ 文章版面费报销单 (`articleFeeReimburseForm`)
- ✅ 日常差旅报销单 (`generalTravelReimburseForm`)
- ✅ 晚霞关爱基金报销单 (`pensionReimburseForm`)
- ✅ 短期因公出国报销单 (`shortAbroadBusinessReimburseForm`)
- ✅ 研究生生活补助报销单 (`livingAllowanceReimburseForm`)
- ✅ 通用报销单 (`generalReimburseForm`)

#### 特色配置
- 简化的表单结构
- 使用 `Rs*` 系列人事组件
- 注重移动端体验

---

### 3. 湖南人民医院

**院区特点**: 专注报销单据

#### 报销单据 (15 个)
- ✅ 专家咨询费报销 (`expertConsultationReimburseForm`)
- ✅ 举办会议报销单 (`holdMeetingReimburseForm`)
- ✅ 举办培训报销单 (`holdTrainingReimburseForm`)
- ✅ 党建活动经费报销单 (`partyBuildingReimburseForm`)
- ✅ 公务接待报销单 (`officialReceptionReimburseForm`)
- ✅ 其他日常经费报销单 (`dailyFundReimburseForm`)
- ✅ 劳务费报销单 (`laborFeeReimburseForm`)
- ✅ 国内进修报销单 (`refresherTrainingReimburseForm`)
- ✅ 国外进修报销单 (`abroadRefresherTrainingReimburseForm`)
- ✅ 工会文体协会经费报销单 (`tradeUnionActivReimburseForm`)
- ✅ 文章版面费报销单 (`articleFeeReimburseForm`)
- ✅ 日常差旅报销单 (`generalTravelReimburseForm`)
- ✅ 短期因公出国报销单 (`shortAbroadBusinessReimburseForm`)
- ✅ 研究生生活补助报销单 (`livingAllowanceReimburseForm`)
- ✅ 通用报销单 (`generalReimburseForm`)

---

### 4. 自贡四院

**院区特点**: 配置较为全面

#### 事前申请 (4 个)
- ✅ 举办会议申请单
- ✅ 举办培训申请单
- ✅ 公务接待清单
- ✅ 出差申请单

#### 报销单据 (15 个)
- ✅ 常规报销单据类型（与湖南人民医院类似）

#### 资金单据 (2 个)
- ✅ 借款单 (`hxLoanBill`)
- ✅ 退款单

---

### 5. 重庆中医院

**院区特点**: 中等规模配置

#### 事前申请 (5 个)
- ✅ 举办会议申请单
- ✅ 举办培训申请单
- ✅ 公务接待清单
- ✅ 出差申请单
- ✅ 党建活动经费申请

#### 报销单据 (13 个)
- ✅ 常用报销单据类型

#### 资金单据 (2 个)
- ✅ 借款单
- ✅ 预付单

---

### 6. 福建人民医院

**院区特点**: 精简配置

#### 报销单据 (16 个)
- ✅ 标准配置（参考其他院区）

---

### 7. 成都高新区妇女儿童医院

**院区特点**: 专科化配置

#### 事前申请 (5 个)
- ✅ 定制化申请表单

#### 报销单据 (3 个)
- ✅ 常用报销单据

#### 资金单据 (1 个)
- ✅ 借款单

---

### 8. 江西妇幼

**院区特点**: 收入单据为主

#### 其他单据 (1 个)
- ✅ 特殊事项退费单 (`specialItemRefundForm`)

#### 收入单据 (2 个)
- ✅ 医疗收入汇总表
- ✅ 医疗收入月汇总表

---

### 9. 湖南职防院

**院区特点**: 配置最全面的院区之一

#### 事前申请 (17 个)
- ✅ 最完整的事前申请体系

#### 报销单据 (21 个)
- ✅ 丰富的报销单据类型

#### 资金单据 (3 个)
- ✅ 借款单
- ✅ 退款单
- ✅ 预付单

---

### 10. 华西实施

**院区特点**: 实施测试环境

#### 事前单据 (2 个)
- ✅ 测试用途

#### 报销单据 (2 个)
- ✅ 测试用途

---

## 📦 标准配置中心 (单据配置)

位于 `单据配置/` 目录，包含 64 个标准配置项

### 配置分类

#### 基础设置类
- 报销单通用设置 (`reimFormGeneralSettings`)
- 通用凭证设置 (`generalCertificateSettings`)
- 支付配置 (`paymentInfoConfig`)

#### 事前申请配置 (12 个)
- 举办会议申请单设置
- 举办培训申请单设置
- 出差申请单设置
- 公务接待清单设置
- 党建活动经费申请单设置
- ...

#### 报销单据配置 (45 个)
- 举办会议报销单设置
- 举办培训报销单设置
- 公务接待报销单设置
- 日常差旅报销单设置
- 科研经费报销单设置
- ...

#### 资金单据配置 (5 个)
- 借款单设置
- 退款单设置
- 预付单设置
- 还款单设置

---

## 🔧 模板组件库

### 华西医院模板组件

#### PC 端组件
- `TaxBaseInfo` - 基础信息组件
- `TaxBasePersonTreeTableDialogSelect` - 人员选择器
- `TaxBaseProjectInfo` - 项目信息组件
- `TaxBaseFeeReceipt` - 费用收据组件
- `TaxWriteOffLoanInfo` - 冲销借款信息组件

#### Mobile 端组件
- `RsBaseInfo` - 基础信息组件（移动版）
- `RsBaseProjectInfo` - 项目信息组件（移动版）
- `RsBaseFeeReceipt` - 费用收据组件（移动版）
- `RsWriteOffLoanInfo` - 冲销借款信息组件（移动版）

### 医大一模板组件
- 类似的组件体系，但针对移动端优化

---

## 🎯 字段命名规范

### 通用字段命名

| 字段名 | 说明 | 类型 | 示例值 |
|--------|------|------|--------|
| `documentCode` | 单据编号 | string | "BX20260325001" |
| `applicationDate` | 申请日期 | string | "2026-03-25" |
| `reimbursementTotalAmount` | 报销总金额 | string | "1000.00" |
| `payableAmount` | 实付金额 | string | "1000.00" |
| `writeOffAmount` | 冲销金额 | string | "0.00" |

### 业务字段命名

| 字段名前缀 | 含义 | 示例 |
|-----------|------|------|
| `hold` | 举办相关 | `holdDate`, `holdPlace` |
| `travel` | 差旅相关 | `travelType`, `travelDays` |
| `project` | 项目相关 | `projectCode`, `projectName` |
| `budget` | 预算相关 | `budgetItem`, `budgetCode` |
| `payment` | 支付相关 | `paymentInfo`, `payeeName` |

---

## 📋 组件使用统计

### 高频组件 Top 10

| 排名 | 组件名 | 使用次数 | 用途 |
|------|--------|---------|------|
| 1 | DtInput | 500+ | 文本输入 |
| 2 | DtSelect | 300+ | 下拉选择 |
| 3 | DtDatePicker | 250+ | 日期选择 |
| 4 | DtMoneyInput | 200+ | 金额输入 |
| 5 | DtNumber | 180+ | 数字输入 |
| 6 | TaxBaseInfo | 100+ | 基础信息展示 |
| 7 | DtFormFieldSet | 100+ | 字段集布局 |
| 8 | TaxBaseProjectInfo | 80+ | 项目选择 |
| 9 | DtTextArea | 60+ | 多行文本 |
| 10 | TaxBaseFeeReceipt | 50+ | 费用明细 |

---

## 🔄 配置同步关系

### 标准配置 → 院区配置

```
单据配置/ (标准模板)
    ↓
华西医院/ (完整实现)
    ↓
其他院区/ (适配版本)
```

### 院区特色 → 标准配置

```
院区创新配置
    ↓
验证成功
    ↓
合并到标准配置
    ↓
推广到其他院区
```

---

## 📈 版本演进

### V1.0 (基础版)
- 简单的表单结构
- 基础字段和组件
- 少量校验规则

### V2.0 (增强版)
- 引入模板组件
- 完善的联动逻辑
- 自定义校验器

### V3.0 (当前版本)
- 多院区适配
- 移动端支持
- fieldMapping 机制
- x-reactions 响应式联动

---

## 🎨 配置差异分析

### 院区间的典型差异

#### 1. 表单标题宽度 (labelWidth)

| 院区 | 默认值 | 原因 |
|------|--------|------|
| 华西医院 | 120px | 历史沿袭 |
| 医大一 | 135px | 优化显示 |
| 其他院区 | 120-140px | 各自调整 |

**建议**: 统一为 135px

#### 2. 组件选择差异

**同一字段不同组件**:
- 华西：`DtDatePicker` (单个日期)
- 医大：`DtRangePicker` (日期范围)

**原因**: 业务需求不同

#### 3. 校验规则严格程度

| 院区 | 校验严格度 | 特点 |
|------|-----------|------|
| 华西医院 | 高 | 多处自定义校验 |
| 医大一 | 中 | 基础校验为主 |
| 其他院区 | 低 | 简化处理 |

---

## 🛠️ 维护建议

### 定期任务

#### 每月
- [ ] 检查各院区配置一致性
- [ ] 收集院区新增需求
- [ ] 更新标准配置模板

#### 每季度
- [ ] 清理废弃字段
- [ ] 优化性能问题
- [ ] 整理最佳实践

#### 每年
- [ ] 大版本升级评估
- [ ] 技术栈更新
- [ ] 架构优化

### 变更管理流程

```
需求提出
    ↓
影响分析
    ↓
方案设计
    ↓
开发测试
    ↓
试点运行
    ↓
全面推广
    ↓
效果评估
```

---

## 📞 技术支持

### 常见问题 FAQ

**Q: 如何快速定位某个字段？**
A: 使用 `search-field.ps1` 脚本全局搜索

**Q: 多院区配置不一致怎么办？**
A: 先分析原因，再决定是统一还是保留差异

**Q: 修改 schema 后如何验证？**
A: 
1. JSON 格式验证：`jq '.' file.json`
2. 开发环境预览
3. 功能测试

### 联系方式

- 技术支持群：xxx
- 文档地址：`.qoder/skills/schema-organizer/`
- 工具脚本：`.qoder/skills/schema-organizer/reference.md`

---

## 📚 相关文档

1. [SKILL.md](SKILL.md) - Schema 整理技能说明
2. [examples.md](examples.md) - 详细使用示例
3. [reference.md](reference.md) - 工具脚本手册
4. [README.md](README.md) - 快速开始指南

---

**文档更新时间**: 2026-03-25  
**维护团队**: 智慧财务审批平台团队
