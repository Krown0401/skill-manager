---
name: schema-organizer
description: 整理和分析多院区表单 schema 配置，支持 schema 变动调整、差异对比和结构分析。适用于批量修改 schema、统一配置标准或迁移表单模板场景。
---

# Schema 整理与分析工具

## 功能概述

本工具用于整理和分析智慧财务审批平台中各院区的 Formily 表单 schema 配置，提供结构分析、差异对比、批量调整和标准化检查等核心能力。

## 快速导航

- **Schema 结构与分类**: 查看 [schema-info.md](references/schema-info.md) 了解字段属性、组件类型及单据分类。
- **操作流程与最佳实践**: 查看 [workflows.md](references/workflows.md) 获取标准修改流程及 FAQ。
- **使用场景与示例**: 查看 [examples.md](references/examples.md) 了解实际应用案例（如影响范围分析、批量更新等）。
- **工具脚本手册**: 查看 [reference.md](references/reference.md) 获取用于搜索、对比和统计的脚本工具。
- **院区配置总览**: 查看 [overview.md](references/overview.md) 了解各医院单据配置详情。

## 核心任务指南

### 1. Schema 变动影响分析
当需要修改公共字段或组件时，先执行全局搜索确定受影响的院区和单据。
参考：[examples.md](references/examples.md#场景-1-schema-变动影响分析)

### 2. 多院区配置同步
修改标准模板后，需确保改动同步至受影响的院区，并保持院区特有配置的完整性。
参考：[workflows.md](references/workflows.md#step-3-制定修改方案)

### 3. 标准化与质量控制
所有新增或修改的 schema 必须符合命名规范、组件使用规范，并包含完整的校验和注释。
参考：[workflows.md](references/workflows.md#最佳实践)

## 工具脚本

技能内置了 PowerShell 脚本用于辅助操作（位于 `scripts/` 目录）：
- `search-field.ps1`: 全局搜索字段引用
- `compare-schemas.ps1`: 对比两个 schema 文件差异
- `count-forms.ps1`: 统计各院区表单数量
- `backup-schemas.ps1`: 备份所有配置文件

详细说明请见 [reference.md](references/reference.md)。
