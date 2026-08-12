# PC 端与移动端 Schema 配置核心区别

> **使用说明**：本 skill **以 PC 端为核心**。本文档仅在**需要将 PC 端 schema 同步到移动端**时查阅，帮助进行两端转换。

本文用于快速梳理 Formily 单据在 PC 端与移动端配置时的关键差异、常见坑点与落地检查项。

## 1. 架构与页面骨架差异

| 维度 | PC 端常见写法 | 移动端常见写法 | 注意事项 |
| --- | --- | --- | --- |
| 表单容器 | `DtForm` | `DtFNutForm` | 不要混用，容器错误会导致整页渲染异常 |
| 主体结构 | 常见直接在 `properties` 分组 | 常见 `_header` + `_collapse` + `_attrTab_` | 湖南职防院移动端推荐沿用该骨架 |
| 底部按钮 | `PreGroupBtns` | `PreGroupBtns` | 移动端通常需要 `attrFiled: "_attrTab_"` 与 Tab 区联动 |
| 基础信息区 | `TaxBaseInfo` | `RsBusTripInfo` | 标题、申请人、科室、日期一般放在头部预览区 |

## 2. 装饰器与组件命名差异

| 场景 | PC 端 | 移动端 | 注意事项 |
| --- | --- | --- | --- |
| 装饰器 | 常见 `FormItem` / `DtFormItem` | 常见 `DtFNutFormItem` | 同一端内保持一致，避免 `FormItem` 与 `DtFNutFormItem` 混用 |
| 输入框 | `DtInput` / `DtTextarea` | `DtFNutInput` / `DtFNutTextarea` | 移动端尽量使用 `DtFNut*` |
| 下拉 | `DtSelect` | `DtFNutActionSheet` | 有导入/字典场景建议同时配 `options` 与 `enum` |
| 金额输入 | `DtAmountInput` / `DtInputNumber` | `DtFNutInputNumber` | 金额字段统一补 `decimalPlaces` 与最小值校验 |
| 人员选择 | `TaxBasePersonTreeTableDialogSelect` | `RsPersonSelect` | `fieldMapping` 要与接口字段严格一致 |
| 预算项目 | `TaxBaseProjectInfo` | `RsProjectInfo` 或 `RsPreBaseEdit` | 移动端列表展示优先卡片化组件 |

## 3. 子表/明细配置模式差异

| 维度 | PC 端 | 移动端 | 注意事项 |
| --- | --- | --- | --- |
| 明细编辑 | 表格列配置更常见 | 卡片编辑更常见（`RsPreBaseEdit`） | 移动端不要套 PC 表格思路 |
| 预览展示 | 列表列直接展示 | 常用 `definitions.preview` + `FPreviewText.*` | `RsPreBaseEdit` 推荐用 `definitions + properties` |
| 汇总金额 | 列或 footer 汇总 | 常见隐藏字段 `totalAmount` + `x-reactions` 汇总 | 显示字段与提交字段可分离，避免覆盖原值 |

## 4. 联动与表达式差异

| 维度 | 共性 | 移动端额外注意 |
| --- | --- | --- |
| 联动入口 | 统一使用 `x-reactions` | 行内字段依赖上层字段时，优先使用根路径依赖或在数组根字段联动 |
| 取值变量 | `$self`、`$deps`、`$form`、`$values`、`$userInfo` | 移动端动态卡片里需关注 `$record` 与 `pFormVals` 的上下文差异 |
| 显隐处理 | `required`、`x-validator`、`x-hidden/x-visible` 联动 | 隐藏字段时建议同时清空值，避免提交脏数据 |

## 5. 选择器与 fieldMapping 差异

| 维度 | 核心要求 | 常见问题 |
| --- | --- | --- |
| `value/label` 映射 | `type: value` 与 `type: label` 必须分清 | 只映射 value 导致展示名称丢失 |
| 扩展字段映射 | 部门、职务、职称等通过额外 mapping 回填 | `sourceField` 与接口字段不一致导致回填失败 |
| `labelInValue` | 按组件能力和下游字段决定 true/false | 两端配置不一致导致提交结构不一致 |

## 6. 校验与交互差异

| 维度 | 建议 |
| --- | --- |
| 必填 | `required: true` 与 `x-validator` 同时配置，避免仅写其一 |
| 金额 | 统一补 `minimum`、`decimalPlaces`，消息文案统一 |
| 只读/禁用 | 展示字段优先 `readonly`；确需禁止编辑再用 `disabled` |
| 日期 | 默认值建议统一 `{{DATETOSTR(TODAY(), 'YYYY-MM-DD')}}` 风格 |

## 7. 目录与复用差异

| 维度 | 建议 |
| --- | --- |
| 目录结构 | 单据保持 `pc/form.json` 与 `mobile/form.json` 双端并行 |
| 预算模块复用 | 优先通过 `$ref` 复用 `definitions`，减少复制粘贴 |
| 院区风格一致性 | 新单据优先对齐同院区同类型已有单据骨架 |

## 8. 高频踩坑清单

1. 移动端使用了 PC 组件，导致组件不识别或样式错乱。  
2. 在移动端 `RsPreBaseEdit` 使用 `items` 结构，导致预览/编辑异常。  
3. `x-decorator` 混用 `FormItem` 与 `DtFNutFormItem`，导致布局与校验表现不一致。  
4. 底部按钮未配置 `attrFiled`，Tab 页面下交互异常。  
5. `options` 配了但 `enum` 未配，部分动作面板场景展示或导入异常。  
6. 联动只做显隐不清值，隐藏字段仍被提交。  
7. 汇总金额直接写展示字段，导致预算联动取值不稳定。  

## 9. 配置前后检查清单（推荐）

### 配置前

1. 先找同院区同类型单据，确定移动端骨架。  
2. 明确双端字段命名和提交字段是否一致。  
3. 明确选择器接口字段和 `fieldMapping`。  

### 配置后

1. 校验 JSON 语法与组件命名是否全端正确。  
2. 校验必填、显隐、清值、默认值是否符合业务。  
3. 校验明细新增/编辑/预览与汇总金额是否正确。  
4. 校验预算模块是否正确监听金额字段。  
5. 对照 UI 图逐项核对标题、顺序、星号、占位符。  

