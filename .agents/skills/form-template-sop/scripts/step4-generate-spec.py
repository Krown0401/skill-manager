#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path

def parse_args():
    parser = argparse.ArgumentParser(description="Step 4: 生成最终实施文档 (Implementation Spec)")
    parser.add_argument("--task-dir", required=True, help="任务目录路径")
    parser.add_argument("--output", required=True, help="输出 Spec 文档路径")
    return parser.parse_args()

def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def render_spec_field_row(f):
    title = f.get("title", "")
    name = f.get("name", "")
    pc_comp = f.get("pc_component", "")
    mobile_comp = f.get("mobile_component", "")
    req = "是" if f.get("required") else "否"
    src = f.get("_source", "")
    
    dict_code = "—"
    if f.get("_dictCheck") and f["_dictCheck"].get("options"):
        opts = f["_dictCheck"]["options"]
        if opts and len(opts) > 0:
            dict_code = opts[0].get("dictCode", "—")
    
    return f"| {title} | `{name}` | `{pc_comp}` | `{mobile_comp}` | {req} | `{dict_code}` | {src} |"

def generate_spec(enriched_data, task_dir):
    lines = []
    task_info = enriched_data.get("task_info", {})
    hospital = task_info.get("hospital", "未知医院")
    form_name = task_info.get("form_name", "未知单据")
    jira_id = task_info.get("jira_id", "未知Jira")

    lines.append(f"# 实施文档 (Implementation Spec): {form_name}")
    lines.append(f"\n> Jira: {jira_id} | 医院: {hospital} | 生成日期: {task_info.get('analysis_time', '')}")
    lines.append("\n## 1. 核心配置契约 (Handover Contract)")
    lines.append("\n**请 AI 配置助手 (schema-creator) 严格遵守以下定义进行 schema 编写。严禁自行修改字段名或组件类型。**")

    # 1. 布局指令
    lines.append("\n## 2. 布局指令 (Layout & Grid)")
    sections = enriched_data.get("sections", [])
    for sec in sections:
        title = sec.get("title", "未命名分区")
        grid = sec.get("grid", 3)
        lines.append(f"- **分区: {title}**")
        lines.append(f"  - 栅格列数 (grid): `{grid}`")
        fields = sec.get("fields", [])
        for f in fields:
            span = f.get("gridSpan", 1)
            if span > 1:
                lines.append(f"  - 字段 `{f.get('name')}` ({f.get('title')}): `gridSpan: {span}`")

    # 2. 完整字段定义 (合并了 API 映射)
    lines.append("\n## 3. 字段定义 (Fields Definition)")
    lines.append("\n### 3.1 主表字段 (Main Fields)")
    lines.append("\n| 标题 | Prop名 (Name) | PC组件 | 移动端组件 | 必填 | 字典编码 | 数据来源 |")
    lines.append("| --- | --- | --- | --- | :---: | --- | --- |")
    
    fields_verified = enriched_data.get("fields_verified", [])
    for f in fields_verified:
        lines.append(render_spec_field_row(f))

    # 3. 子表字段 (从 table_fields 中提取)
    table_fields = enriched_data.get("table_fields", [])
    if table_fields:
        for tbl in table_fields:
            lines.append(f"\n### 3.2 子表: {tbl.get('title')} (Table Fields)")
            lines.append("\n| 标题 | Prop名 (Name) | PC组件 | 移动端组件 | 必填 | 字典编码 | 数据来源 |")
            lines.append("| --- | --- | --- | --- | :---: | --- | --- |")
            for f in tbl.get("fields", []):
                lines.append(render_spec_field_row(f))

    # 4. 必要隐藏字段 (System Hidden Fields)
    lines.append("\n## 4. 必要隐藏字段 (System Hidden Fields)")
    lines.append("\n这些字段在 UI 不可见，但提交接口必需：")
    hidden_fields = [
        {"name": "recId", "desc": "记录标识"},
        {"name": "status", "desc": "单据状态"},
        {"name": "accountYear", "desc": "核算年度"},
        {"name": "busiDocumentStatus", "desc": "业务状态标签", "default": "unsubmitted"}
    ]
    for hf in hidden_fields:
        default_str = f" (默认: `{hf['default']}`)" if "default" in hf else ""
        lines.append(f"- `{hf['name']}`: {hf['desc']}{default_str}")

    # 4. 联动与高级逻辑 (深度整合参考单据语法)
    lines.append("\n## 5. 联动与逻辑指令 (Reactions & Logic)")
    reactions = enriched_data.get("reactions", [])
    if reactions:
        for r in reactions:
            lines.append(f"### {r.get('type')}")
            lines.append(f"- **描述**: {r.get('description')}")
            if "formula" in r:
                lines.append(f"- **公式/语法**: `{r['formula']}`")
    else:
        lines.append("\n> 暂无特定联动描述，请参考标准进修类单据逻辑。")

    # 5. 参考单据深度参考 (重要)
    lines.append("\n## 6. 参考单据深度资料 (Reference Deep Dive)")
    lines.append("\n**请特别注意参考单据中的以下配置模式：**")
    
    # 尝试寻找 index.md 中的参考单据路径并读取其 form.json
    raw_material_path = Path(task_dir) / "原始资料" / "index.md"
    if raw_material_path.exists():
        lines.append("- **参考路径**: 已在 `原始资料/index.md` 中标注。")
        lines.append("- **配置建议**: 优先使用参考单据中的 `fieldMapping` 结构，特别是人员选择和部门选择的多字段回填逻辑。")

    lines.append("\n## 7. 交付自检清单 (Checklist)")
    lines.append("- [ ] 所有 prop 名是否与本 Spec 第 3 节完全一致？")
    lines.append("- [ ] `grid` 和 `gridSpan` 是否符合第 2 节的要求？")
    lines.append("- [ ] 隐藏字段是否已在 `form` 对象下定义？")
    lines.append("- [ ] PC 端 `x-reactions` 是否处理了空值回退？")
    lines.append("- [ ] 移动端是否使用了 AMIS 表达式语法？")

    return "\n".join(lines)

def main():
    args = parse_args()
    enriched_path = os.path.join(args.task_dir, "分析_结果/enriched-combined.json")
    if not os.path.exists(enriched_path):
        # 兼容旧路径
        enriched_path = os.path.join(args.task_dir, "分析结果/enriched-combined.json")
        
    enriched_data = load_json(enriched_path)
    if not enriched_data:
        print(f"错误：找不到 enriched JSON 文件: {enriched_path}")
        sys.exit(1)
        
    spec_content = generate_spec(enriched_data, args.task_dir)
    
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(spec_content)
        
    print(f"已生成实施文档 (Spec): {output_path}")

if __name__ == "__main__":
    main()
