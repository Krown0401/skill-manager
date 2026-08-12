---
name: schema-creator
description: 专注于 PC 端 Formily 表单 schema 配置创建，覆盖新单据配置、字段联动、表格子表（预算项目）等场景。**可附带处理关联移动端同步**，但核心能力聚焦 PC 端。支持自动学习总结配置经验。
---

# PC 端 Schema 创建工具

## 功能概述

本工具专注为智慧财务审批平台中各院区创建 **PC 端** Formily 表单 schema 配置，提供需求分析、字段配置、联动实现、预算项目子表配置等完整流程指导。

> **定位说明**：本 skill 以 PC 端单据配置为**核心能力**，移动端配置仅作附带处理。当需要移动端配置时，请先确保 PC 端 schema 完成，再通过组件映射规则进行转换。

**特色功能**：支持自动学习 - 每次完成配置后，可自动将经验总结追加到知识库中。

## 快速导航（PC 端优先）

| 优先级 | 参考文档 | 适用场景 |
|:---:| --- | --- |
| ★★★ | [guide.md](references/guide.md) | PC 端完整配置流程（新单据、字段联动、预算项目子表） |
| ★★★ | [components.md](references/components.md) | PC 端组件速查 + 组件属性说明 |
| ★★☆ | [faq.md](references/faq.md) | PC 端常见问题排查 |
| ★★☆ | [experiences.md](references/experiences.md) | 查看/追加实际配置经验 |
| ★★☆ | [amis 表达式语法.md](references/amis%20表达式语法.md) | 移动端联动和判断逻辑（AMIS 表达式） |
| ★☆☆ | [pc-mobile-differences.md](references/pc-mobile-differences.md) | 需同步移动端时参考（PC 为主，移动端为对照） |

## 核心任务指南（PC 端）

### 1. PC 端新单据创建
从零创建 PC 端表单配置，包括目录结构搭建、基础字段配置。
参考：[guide.md](references/guide.md#第一步-创建目录结构)

### 2. PC 端字段联动配置
实现字段之间的依赖关系（显隐、取值、置灰），使用 `x-reactions`。
参考：[guide.md](references/guide.md#第四步-实现字段联动x-reactions)

### 3. PC 端表格子表配置（预算项目）
配置 `TaxBaseProjectInfo` 预算项目表格子表，包括列配置、模板组件引用、fieldMapping。
参考：[guide.md](references/guide.md#第五步-配置表格子表)

### 4. PC 端模板组件引用
**高价值实践**：优先检查当前单据目录下是否存在 `模板组件/pc/`，若有则通过 `$ref` 引用，避免重复内联。
参考：[guide.md](references/guide.md#模板组件引用优先原则)

### 5. UI 精确对标验证（核心原则）
**强制性步骤**：提交 schema 更改前，必须根据 UI 截图/原型图进行逐项比对验证。
参考：[guide.md](references/guide.md#第七步验证与调试)

### 6. 移动端联动和判断逻辑（AMIS 表达式）
编写移动端 `x-reactions` 联动和判断逻辑时，使用 AMIS 表达式语法（如 `IF`、`AND`、`OR`、`DATETOSTR`、`TODAY` 等），**不要使用 JS 表达式**。
参考：[amis 表达式语法.md](references/amis%20表达式语法.md)

### 7. 经验总结（自动学习）
完成配置后，将经验追加到 [experiences.md](references/experiences.md)，持续丰富知识库。

**触发方式**：告诉 AI "将本次配置经验追加到知识库"，AI 将自动提取关键信息并更新 experiences.md。

## 自动学习机制

### 工作原理

```
用户完成 PC 端配置 → 请求总结 → AI 提取关键点 → 追加到 experiences.md
```

### 总结内容

每次总结将包含：
1. **配置概要**：单据名称、应用编码、单据类型、涉及院区、PC/移动端
2. **关键实现**：PC 端重要功能点的实现方案和代码示例
3. **踩坑记录**：PC 端遇到的问题及解决方案
4. **经验总结**：可复用的 PC 端经验教训

### 示例总结

```
## 2026-04-24 人才经费使用申请 - 湖南人民医院

### 配置概要
- 应用编码：talentFundsUsageApplication
- 单据类型：事前申请
- 端：PC

### 关键实现

#### 人才经费类型联动（PC 端）
**场景**：选择人才计划后自动带出人才经费类型
**实现方案**：使用 $form.getFieldState() 动态获取数据源
**关键代码**：
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

### 踩坑记录
| 坑点 | 解决方案 |
|------|----------|
| 硬编码联动逻辑 | 使用 $form.getFieldState() 动态获取 |
| 空值导致报错 | 添加三元运算符判断 $deps[0] ? ... : '' |

### 经验总结
- 联动逻辑避免硬编码，使用动态获取数据源
- 使用可选链操作符 ?. 进行安全访问
- 添加空值判断防止 undefined
```

## 常用脚本

技能内置了 PowerShell 脚本用于辅助操作（位于 `schema-organizer/scripts/` 目录）：
- `search-field.ps1`: 全局搜索字段引用
- `compare-schemas.ps1`: 对比两个 schema 文件差异
- `count-forms.ps1`: 统计各院区表单数量

详细说明请见 [schema-organizer/reference.md](../schema-organizer/references/reference.md)。
