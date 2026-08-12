# PC 端配置常见问题

本文档列出 **PC 端** Formily 表单配置过程中的常见问题及解决方案。

> **提示**：移动端相关问题请参考 [pc-mobile-differences.md](pc-mobile-differences.md)。

## 一、模板组件引用问题

### Q1: $ref 引用不生效

**问题描述**：通过 `$ref` 引用的模板组件没有正常加载。

**常见原因**：
1. `definitions` 中的键名与 `$ref` 中引用的名称不匹配
2. `definitions` 未正确定义在 `form.json` 的顶层
3. 模板组件文件路径错误或不存在

**解决方案**：
1. 检查 `$ref` 的值是否与 `definitions` 中的键名完全一致
2. 确保 `definitions` 定义在 `form.json` 顶层（与 `type`, `properties` 同级）
3. 使用模板组件文件时，确保文件路径正确，通过复制粘贴内容到 `definitions` 中验证

### Q2: 模板组件中字段被外部覆盖

**问题描述**：引用的模板组件中某些字段需要在当前单据中定制。

**解决方案**：在 `properties` 中引用模板的同名字段上覆盖 `required` / `x-validator` 等属性：

```json
"budgetItems": {
  "$ref": "#/definitions/TaxBaseProjectInfo_application_budgetItems"
}
```

在 properties 中无法直接覆盖，需要在 definitions 中按业务需求调整模板。

## 二、联动问题

### Q3: 字段联动不生效

**问题描述**：`x-reactions` 配置的联动逻辑没有生效。

**常见原因**：
1. 表达式语法错误
2. 依赖字段名称写错
3. 试图在非数据源组件上使用 `$self.dataSource`

**解决方案**：

❌ 错误写法：
```json
"talentFundingType": {
  "x-reactions": {
    "dependencies": ["talentPlan"],
    "fulfill": {
      "state": {
        "value": "{{$self.dataSource.find(item => item.value === $deps[0])?.label + '经费'}}"
      }
    }
  }
}
```

✅ 正确写法（使用 `$form.getFieldState()` 动态获取）：
```json
"talentFundingType": {
  "x-reactions": {
    "dependencies": ["talentPlan"],
    "fulfill": {
      "state": {
        "value": "{{$deps[0] ? ($form.getFieldState('talentPlan').dataSource?.find(item => item.value === $deps[0])?.label + '经费') : ''}}"
      }
    }
  }
}
```

### Q4: 联动时数据源获取失败

**问题描述**：使用 `$form.getFieldState()` 获取数据源时返回 undefined。

**解决方案**：
1. 确保依赖字段存在且有值
2. 使用可选链操作符 `?.` 进行安全访问
3. 添加空值判断

### Q5: 硬编码联动逻辑

**问题描述**：联动逻辑写死了，如 `$deps[0] === '01' ? '选项1' : ($deps[0] === '02' ? '选项2' : '')`。

**问题**：当数据源变化时需要手动维护，不够灵活。

**解决方案**：动态从数据源获取。

### Q6: 预算项目首行联动不触发

**问题描述**：在预算项目子表中配置了联动自动回填金额，但新增首行时未触发。

**解决方案**：联动写在**数组根字段**而非行内字段：

```json
"budgetItems": {
  "x-reactions": [
    {
      "dependencies": ["feeDetails#data", "budgetItems"],
      "fulfill": {
        "run": "const list = Array.isArray($self.value) ? $self.value : []; if (list.length === 1) { const total = (Array.isArray($form.values.feeDetails) ? $form.values.feeDetails : []).reduce((sum, item) => sum + (Number(item?.amount) || 0), 0); const raw = list[0]?.occupyAmt; if ((raw === undefined || raw === null || raw === '' || Number(raw) === 0) && (Number(raw) !== Number(total))) { $form.setValues({ budgetItems: [{ ...(list[0] || {}), occupyAmt: total }] }); } }"
      }
    }
  ]
}
```

### Q7: DtEditTable 列中联动无法取到上层字段

**问题描述**：在 `DtEditTable.Column` 中通过依赖联动，使用相对字段名取不到值。

**解决方案**：使用根路径写法：

```json
"dependencies": [".printMaterialBusType"]
```

而不是：
```json
"dependencies": ["printMaterialBusType"]
```

## 三、fieldMapping 问题

### Q8: 选择器选择的值没有正确填充

**问题描述**：选择了人员/项目后，表单字段没有正确填充。

**常见原因**：
1. `sourceField` 与接口返回的字段名不匹配
2. `targetField` 与表单字段名不匹配
3. `type` 类型写错（value/label/other）

**解决方案**：
1. 确认接口文档中的字段名
2. 对照 model.md 检查 targetField
3. 确保 `type` 类型正确

### Q9: 导入功能 fieldMapping 不一致

**问题描述**：使用 Excel 导入功能时，模板下载报错或导入后字段映射错误。

**解决方案**：
- `excelMappingList` 的字段名与 `fieldMapping` 的 `targetField` 保持一致
- `x-component-props` 中配置 `params` 包含 `certCode` 和 `certDetailCode`

## 四、表格子表问题

### Q10: DtEditTable 列 prop 冲突

**问题描述**：预算项目表格中，选择器列可以显示但无法点击打开弹窗。

**常见原因**：两个 `DtEditTable.Column` 绑定了相同 `prop`。

**解决方案**：确保每列 `prop` 唯一：
- 预算项目选择列绑定 `projectCode`
- 名称展示列绑定 `projectName`

### Q11: 合计行数据不显示

**问题描述**：子表配置了 `isSummary: true` 但合计行没有数据显示。

**解决方案**：
1. 检查 `x-component-props` 是否配置 `showSummary: true`
2. 检查 `isSummary` 列的 `render` 逻辑是否正确
3. 确保数据格式正确

## 五、前端字段问题

### Q12: 默认值不生效

**问题描述**：配置了 `default` 但表单加载时没有显示。

**解决方案**：
1. 确保 `default` 在字段定义的顶层
2. 确保字段类型正确（如 `type: "number"` 的字段 default 应为数字而非字符串）

### Q13: 字段隐藏后值仍然提交

**问题描述**：隐藏的字段值仍然被提交。

**解决方案**：
1. 在 `x-reactions` 中同时清除值
2. 或在提交前处理隐藏字段的值

### Q14: 日期选择器回显不显示

**问题描述**：暂存后再次打开表单，日期字段显示为空。

**解决方案**：确保 `DtDatePicker` 配置了 `valueFormat` 和 `format`：

```json
"x-component-props": {
  "dateType": "date",
  "valueFormat": "yyyy-MM-dd",
  "format": "yyyy-MM-dd"
}
```

### Q15: 下拉框在导入场景无数据

**问题描述**：配置了 `DtSelect` 下拉选择，但导入模板时下拉列表为空。

**解决方案**：同时配置 `options` 和 `enum` 两个属性，并在 `x-data` 中声明字典编码。

## 六、校验问题

### Q16: 必填字段校验不生效

**问题描述**：配置了 `required: true` 但校验没有生效。

**解决方案**：
1. 确保 `x-validator` 是数组格式：`[{ "required": true, "message": "请填写" }]`
2. 确保字段在表单的 `properties` 中正确定义

### Q17: 格式校验不生效

**问题描述**：`pattern` 或 `format` 校验没有生效。

**解决方案**：
1. 确保正则表达式正确
2. 使用双反斜杠转义：`"\\d+"` 而不是 `"\d+"`

## 七、JSON 格式问题

### Q18: JSON 语法错误

**问题描述**：表单无法加载，提示 JSON 格式错误。

**常见原因**：
1. 多余的逗号
2. 括号不匹配
3. 引号不匹配

**解决方案**：
1. 使用 VS Code JSON 格式化检查语法
2. 确保没有多余逗号（如 `"key": "value",` 在对象最后一项）
3. 确保所有引号都是双引号

### Q19: 字段名与 model.md 不一致

**问题描述**：字段名与数据模型定义不一致，导致提交数据丢失。

**解决方案**：
1. 严格对照 model.md 校正字段名
2. 注意大小写（驼峰命名）

## 八、调试技巧

### Q20: 如何查看字段当前状态

在浏览器控制台执行：

```javascript
form.query('fieldName').getState()
```

### Q21: 如何调试 x-reactions

1. 使用 `console.log` 输出中间变量
2. 在 `run` 属性中执行调试代码

```json
"x-reactions": {
  "dependencies": ["field1"],
  "fulfill": {
    "state": {},
    "run": "console.log('deps:', $deps)"
  }
}
```
