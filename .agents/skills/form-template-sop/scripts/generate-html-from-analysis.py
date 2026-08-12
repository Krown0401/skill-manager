#!/usr/bin/env python3
"""从 analysis-result.json 生成 HTML 可视化文件

用法:
  python generate-html-from-analysis.py --input <分析结果.json> --output <输出.html>
  python generate-html-from-analysis.py --input <分析结果.json> --output <输出.html> --screenshot <截图相对路径>
"""

import argparse
import json
import os
import sys
from datetime import datetime


def parse_args():
    parser = argparse.ArgumentParser(description="从分析结果 JSON 生成 HTML 可视化")
    parser.add_argument("--input", required=True, help="分析结果 JSON 路径")
    parser.add_argument("--output", required=True, help="输出 HTML 路径")
    parser.add_argument("--screenshot", help="截图相对路径（相对于 HTML 文件所在目录）")
    return parser.parse_args()


def load_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def render_tag(label, tag_class):
    return f'<span class="tag {tag_class}">{label}</span>'


def render_wireframe(sections, form_name=""):
    """渲染线框图：按 section 分组, 根据 grid 和 gridSpan 分行渲染"""
    if not sections:
        return ""

    parts = []
    for section in sections:
        title = section.get("title", "")

        # Header section — 渲染为横排元数据行，非表单栅格
        if section.get("type") == "header":
            parts.append('<div class="form-section header-bar">')
            status = section.get("status", "")
            # 优先用 section 中的 formTitle，否则用传入的 form_name
            form_title = section.get("formTitle") or form_name or title
            status_html = f'<span class="header-status">{status}</span>' if status else ""
            parts.append(f'<div class="header-title-row"><span class="header-form-name">{form_title}</span>{status_html}</div>')
            parts.append('<div class="header-meta-row">')
            fields = section.get("fields", [])
            meta_parts = []
            for f in fields:
                label = f.get("label", "")
                value = f.get("value", "")
                auto = f.get("auto", False)
                auto_hint = ' <span class="header-auto">自动</span>' if auto else ""
                meta_parts.append(f'<span class="header-meta-item"><span class="header-meta-label">{label}:</span> <span class="header-meta-value">{value}</span>{auto_hint}</span>')
            parts.append(' <span class="header-sep">|</span> '.join(meta_parts))
            parts.append('</div>')
            parts.append('</div>')
            continue

        # Table section
        if section.get("type") == "table":
            parts.append('<div class="form-section">')
            parts.append(f'<div class="section-title">{title}</div>')
            parts.append(render_table_section(section))
            parts.append('</div>')
            continue

        # Grid section
        grid = section.get("grid", 3)
        fields = section.get("fields", [])
        parts.append('<div class="form-section">')
        parts.append(f'<div class="section-title">{title} <span class="grid-hint">({grid}列栅格)</span></div>')

        # Build rows: iterate fields, wrap when row exceeds grid columns
        rows = []
        current_row = []
        current_span = 0

        for field in fields:
            span = field.get("gridSpan", 1)
            if current_span + span > grid and current_row:
                rows.append(current_row)
                current_row = []
                current_span = 0
            current_row.append(field)
            current_span += span

        if current_row:
            rows.append(current_row)

        # Render each row
        for row_fields in rows:
            parts.append('<div class="form-row">')
            for field in row_fields:
                span = field.get("gridSpan", 1)
                width_pct = round(span / grid * 100, 2)
                required_class = "required" if field.get("required") else ""
                parts.append(
                    f'<div class="field-item {required_class}" style="width: {width_pct}%;">'
                )
                parts.append(f'<div class="field-label">{field.get("title", "")}</div>')
                parts.append(f'<div class="field-component">{field.get("component", "")}</div>')
                extras = []
                if field.get("auto_fill"):
                    extras.append("自动带出")
                if field.get("read_only"):
                    extras.append("不可编辑")
                if field.get("default_value"):
                    extras.append(f'默认：{field["default_value"]}')
                if span > 1:
                    extras.append(f"跨{span}列")
                if extras:
                    parts.append(f'<div class="field-value">{" · ".join(extras)}</div>')
                parts.append('</div>')
            parts.append('</div>')

        parts.append('</div>')

    return "\n".join(parts)


def render_table_section(section):
    """渲染表格类型的分区"""
    columns = section.get("columns", [])
    if not columns:
        return "<p>无列定义</p>"

    header_cells = []
    for col in columns:
        title = col.get("title", "")
        width = col.get("width", "")
        required = col.get("required", False)
        label = f"{title} *" if required else title
        style = f' style="width: {width};"' if width else ""
        header_cells.append(f"<th{style}>{label}</th>")

    # Placeholder row to show table structure
    placeholder_cells = []
    for col in columns:
        placeholder_cells.append("<td></td>")

    return (
        '<table class="section-table">\n<thead>\n<tr>'
        + "\n".join(header_cells)
        + '\n</tr>\n</thead>\n<tbody>\n<tr>'
        + "\n".join(placeholder_cells)
        + '\n</tr>\n<tr>'
        + "\n".join(placeholder_cells)
        + '\n</tr>\n</tbody>\n</table>'
    )


def render_field_table(fields):
    """渲染字段汇总表"""
    rows = []
    for f in fields:
        seq = f.get("seq", "")
        name = f.get("name", "") or '<span style="color: #999; font-style: italic;">待生成</span>'
        title = f.get("title", "")
        component = f.get("component", "")

        required = ""
        if f.get("required"):
            required = render_tag("必填", "tag-required")

        auto_fill = ""
        if f.get("auto_fill"):
            auto_fill = render_tag("自动带出", "tag-auto")

        reaction = f.get("reaction", "-")
        if reaction and reaction != "-":
            if "计算" in reaction:
                reaction = render_tag("计算", "tag-cal") + " " + reaction
            elif "联动" in reaction or "显示" in reaction or "隐藏" in reaction:
                reaction = render_tag("联动", "tag-link") + " " + reaction

        rows.append(
            f"<tr>"
            f"<td>{seq}</td>"
            f"<td>{name}</td>"
            f"<td>{title}</td>"
            f"<td>{component}</td>"
            f"<td>{required}</td>"
            f"<td>{auto_fill}</td>"
            f"<td>{reaction}</td>"
            f"</tr>"
        )

    return (
        '<table>\n<thead>\n<tr>'
        '<th>序号</th><th>字段名</th><th>中文标题</th><th>组件类型</th>'
        '<th>必填</th><th>自动带出</th><th>联动规则</th>'
        '</tr>\n</thead>\n<tbody>\n'
        + "\n".join(rows)
        + '\n</tbody>\n</table>'
    )


def render_reactions(reactions):
    """渲染联动规则列表"""
    if not reactions:
        return "<p>无</p>"

    items = []
    for r in reactions:
        rtype = r.get("type", "")
        desc = r.get("description", "")
        items.append(
            '<div class="logic-item">'
            f'<div class="logic-type">{rtype}</div>'
            f'<div class="logic-desc">{desc}</div>'
            '</div>'
        )
    return "\n".join(items)


def render_risks(risks):
    """渲染风险项列表"""
    if not risks:
        return "<p>无</p>"

    items = []
    for r in risks:
        rtype = r.get("type", "")
        desc = r.get("description", "")
        items.append(
            '<div class="risk-item">'
            f'<div class="risk-type">⚠️ {rtype}</div>'
            f'<div class="risk-desc">{desc}</div>'
            '</div>'
        )
    return "\n".join(items)


def render_diff(diff):
    """渲染 PC/移动端差异"""
    if not diff:
        return ""

    parts = []
    layout_items = diff.get("layout", [])
    component_items = diff.get("component", [])

    if layout_items:
        parts.append('<div class="diff-box">')
        parts.append('<div class="diff-title">布局差异</div>')
        for item in layout_items:
            parts.append(f'<div class="diff-item">{item}</div>')
        parts.append('</div>')

    if component_items:
        parts.append('<div class="diff-box">')
        parts.append('<div class="diff-title">组件差异</div>')
        for item in component_items:
            parts.append(f'<div class="diff-item">{item}</div>')
        parts.append('</div>')

    return "\n".join(parts)


def generate_html(data, screenshot_path=None):
    """生成完整的 HTML 文档"""
    task_info = data.get("task_info", {})
    sections = data.get("sections", [])
    fields = data.get("fields", [])
    reactions = data.get("reactions", [])
    risks = data.get("risks", [])
    pc_mobile_diff = data.get("pc_mobile_diff")

    form_name = task_info.get("form_name", "未知单据")
    jira_id = task_info.get("jira_id", "")
    version = task_info.get("version", "")
    terminal = task_info.get("terminal", "")
    analysis_time = task_info.get("analysis_time", datetime.now().strftime("%Y-%m-%d"))

    title = f"{form_name} - {terminal}端 UI 分析"

    # Screenshot section
    screenshot_html = ""
    if screenshot_path:
        screenshot_html = (
            f'<div class="card screenshot-card">'
            f'<div class="card-header">界面截图 ({terminal}端)</div>'
            '<div class="card-body">'
            f'<img src="{screenshot_path}" class="screenshot" alt="截图">'
            '</div>'
            '</div>'
        )

    # Content section (Right side)
    content_parts = []
    
    # PC/Mobile diff
    if pc_mobile_diff:
        content_parts.append(
            '<div class="card">'
            '<div class="card-header">PC端 vs 移动端差异</div>'
            '<div class="card-body">'
            + render_diff(pc_mobile_diff) +
            '</div>'
            '</div>'
        )

    # Wireframe section
    if sections:
        content_parts.append(
            '<div class="card">'
            '<div class="card-header">线框图还原</div>'
            '<div class="card-body">'
            '<div class="wireframe">'
            + render_wireframe(sections, task_info.get("form_name", "")) +
            '</div>'
            '</div>'
            '</div>'
        )

    # Fields table
    content_parts.append(
        f'<div class="card">'
        f'<div class="card-header">{terminal}端字段汇总</div>'
        f'<div class="card-body">'
        f'{render_field_table(fields)}'
        f'</div>'
        f'</div>'
    )

    # Reactions
    content_parts.append(
        '<div class="card">'
        '<div class="card-header">联动规则</div>'
        '<div class="card-body">'
        + render_reactions(reactions) +
        '</div>'
        '</div>'
    )

    # Risks
    content_parts.append(
        '<div class="card">'
        '<div class="card-header">风险项</div>'
        '<div class="card-body">'
        + render_risks(risks) +
        '</div>'
        '</div>'
    )

    content_html = "\n".join(content_parts)

    # Terminal class for conditional styling
    terminal_class = "terminal-mobile" if "移动" in terminal or "Mobile" in terminal.lower() else "terminal-pc"

    # Mismatch warning
    mismatch_warning = ""
    if screenshot_path:
        screenshot_name = os.path.basename(screenshot_path).lower()
        terminal_lower = terminal.lower()
        is_mobile_data = "移动" in terminal or "mobile" in terminal_lower
        is_pc_data = "pc" in terminal_lower or "电脑" in terminal_lower
        
        # 宽松检测：如果文件名包含明确的端标识
        has_mobile_kw = any(kw in screenshot_name for kw in ["mobile", "移动", "phone", "app", "h5"])
        has_pc_kw = any(kw in screenshot_name for kw in ["pc", "电脑", "desktop", "web"])
        
        if (is_mobile_data and has_pc_kw) or (is_pc_data and has_mobile_kw):
            mismatch_warning = (
                f'<div style="background: #ff4d4f; color: white; padding: 12px; margin-bottom: 20px; border-radius: 6px; font-weight: bold; text-align: center; box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3); border: 2px solid #b71c1c;">'
                f'🚨 终端不匹配警告：当前分析数据为 <span style="text-decoration: underline;">{terminal}端</span>，'
                f'但截图文件名 ({os.path.basename(screenshot_path)}) 似乎属于 <span style="text-decoration: underline;">{"PC" if has_pc_kw else "移动"}端</span>'
                '</div>'
            )

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; padding: 20px; color: #333; }}
        .container {{ max-width: 1600px; margin: 0 auto; }}

        .header {{ background: white; padding: 16px 24px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }}
        .header h1 {{ font-size: 20px; color: #1a1a1a; }}
        .header .meta {{ color: #666; font-size: 14px; margin-top: 4px; }}
        
        .terminal-badge {{ 
            padding: 6px 16px; 
            border-radius: 4px; 
            font-weight: 700; 
            font-size: 18px;
            text-transform: uppercase;
        }}
        .terminal-pc .terminal-badge {{ background: #e3f2fd; color: #1565c0; border: 1px solid #1565c0; }}
        .terminal-mobile .terminal-badge {{ background: #f3e5f5; color: #7b1fa2; border: 1px solid #7b1fa2; }}
        .terminal-mobile .terminal-badge::after {{ content: " MOBILE"; }}
        .terminal-pc .terminal-badge::after {{ content: " PC"; }}

        /* 左右布局核心 CSS */
        .main-layout {{ 
            display: flex; 
            gap: 24px; 
            align-items: flex-start; 
        }}
        
        .side-left {{ 
            flex: 0 0 45%; 
            position: sticky; 
            top: 20px; 
            max-height: calc(100vh - 40px);
            overflow-y: auto;
        }}
        
        .side-right {{ 
            flex: 1; 
            min-width: 0; 
        }}

        /* 移动端特殊适配 */
        .terminal-mobile .side-left {{ flex: 0 0 350px; }}

        .card {{ background: white; border-radius: 8px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }}
        .card-header {{ background: #f8f9fa; padding: 12px 20px; font-weight: 600; border-bottom: 1px solid #eee; display: flex; align-items: center; }}
        .card-header::before {{ content: ""; display: inline-block; width: 4px; height: 16px; background: #1565c0; margin-right: 10px; border-radius: 2px; }}
        .terminal-mobile .card-header::before {{ background: #7b1fa2; }}
        .card-body {{ padding: 20px; }}

        .screenshot-card .card-body {{ padding: 10px; background: #eee; text-align: center; }}
        .screenshot {{ max-width: 100%; border: 1px solid #ddd; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 4px; }}

        .wireframe {{ background: #fafafa; border: 1px dashed #ccc; min-height: 100px; padding: 20px; border-radius: 4px; }}
        .form-section {{ margin-bottom: 24px; }}
        .header-bar {{ background: #f5f6f8; border: 1px solid #e0e0e0; border-radius: 6px; padding: 14px 20px; }}
        .header-title-row {{ margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }}
        .header-form-name {{ font-size: 16px; font-weight: 700; color: #1a1a1a; }}
        .header-status {{ font-size: 12px; background: #e8f0fe; color: #1967d2; padding: 2px 10px; border-radius: 12px; }}
        .header-meta-row {{ font-size: 13px; color: #666; display: flex; flex-wrap: wrap; align-items: center; gap: 0; }}
        .header-meta-item {{ white-space: nowrap; }}
        .header-meta-label {{ color: #999; }}
        .header-meta-value {{ color: #333; margin-left: 2px; }}
        .header-auto {{ font-size: 10px; background: #e8f5e9; color: #2e7d32; padding: 0 4px; border-radius: 2px; margin-left: 4px; }}
        .header-sep {{ color: #ddd; margin: 0 12px; user-select: none; }}
        
        .section-title {{ font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #4a90d9; display: flex; justify-content: space-between; }}
        .terminal-mobile .section-title {{ border-bottom-color: #7b1fa2; }}
        .section-title .grid-hint {{ font-weight: 400; font-size: 12px; color: #999; }}
        
        .form-row {{ display: flex; gap: 12px; margin-bottom: 12px; align-items: stretch; }}
        .field-item {{ background: white; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px 12px; box-sizing: border-box; }}
        .field-item.required .field-label::after {{ content: " *"; color: #d32f2f; font-weight: bold; }}
        .field-label {{ font-size: 13px; color: #333; margin-bottom: 4px; font-weight: 500; }}
        .field-component {{ font-size: 12px; color: #666; background: #f5f5f5; padding: 4px 8px; border-radius: 3px; display: inline-block; border: 1px solid #eee; }}
        .field-value {{ font-size: 11px; color: #999; margin-top: 4px; }}

        .section-table {{ width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }}
        .section-table th, .section-table td {{ border: 1px solid #e0e0e0; padding: 8px 10px; text-align: left; }}
        .section-table th {{ background: #f8f9fa; font-weight: 600; white-space: nowrap; color: #555; }}
        .section-table tbody td {{ color: #bbb; }}

        table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
        th, td {{ border: 1px solid #eee; padding: 10px 12px; text-align: left; }}
        th {{ background: #f8f9fa; font-weight: 600; color: #555; }}
        tr:hover {{ background-color: #fafafa; }}
        
        .tag {{ display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 4px; }}
        .tag-required {{ background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }}
        .tag-auto {{ background: #e3f2fd; color: #1565c0; border: 1px solid #bbdefb; }}
        .tag-cal {{ background: #fff3e0; color: #ef6c00; border: 1px solid #ffe0b2; }}
        .tag-link {{ background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }}

        .logic-item {{ padding: 12px; background: #fafafa; border-left: 4px solid #1565c0; margin-bottom: 8px; border-radius: 0 4px 4px 0; }}
        .terminal-mobile .logic-item {{ border-left-color: #7b1fa2; }}
        .logic-type {{ font-weight: 600; color: #1565c0; margin-bottom: 4px; font-size: 13px; }}
        .terminal-mobile .logic-type {{ color: #7b1fa2; }}
        .logic-desc {{ color: #555; font-size: 13px; line-height: 1.5; }}

        .risk-item {{ padding: 12px; background: #fff8e1; border-left: 4px solid #ff9800; margin-bottom: 8px; border-radius: 0 4px 4px 0; }}
        .risk-type {{ font-weight: 600; color: #e65100; margin-bottom: 4px; font-size: 13px; }}
        .risk-desc {{ color: #555; font-size: 13px; line-height: 1.5; }}

        .diff-box {{ background: #f1f8e9; border: 1px solid #c5e1a5; border-radius: 6px; padding: 14px; margin-bottom: 12px; }}
        .diff-title {{ font-weight: 600; color: #33691e; margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; }}
        .diff-title::before {{ content: "⇄"; margin-right: 8px; font-size: 16px; }}
        .diff-item {{ color: #555; font-size: 13px; margin-bottom: 6px; padding-left: 12px; position: relative; }}
        .diff-item::before {{ content: "•"; position: absolute; left: 0; color: #8bc34a; }}
    </style>
</head>
<body class="{terminal_class}">
    <div class="container">
        {mismatch_warning}
        <div class="header">
            <div>
                <h1>{title}</h1>
                <div class="meta">
                    任务：{jira_id} | 版本：{version} | 端：{terminal}端 | 分析时间：{analysis_time}
                </div>
            </div>
            <div class="terminal-badge"></div>
        </div>

        <div class="main-layout">
            <div class="side-left">
                {screenshot_html}
            </div>
            <div class="side-right">
                {content_html}
            </div>
        </div>
    </div>
</body>
</html>'''

    return html


    return html


def main():
    args = parse_args()

    if not os.path.exists(args.input):
        print(f"错误：分析结果文件不存在: {args.input}")
        sys.exit(1)

    data = load_json(args.input)

    screenshot_path = args.screenshot
    html = generate_html(data, screenshot_path)

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(html)

    field_count = len(data.get("fields", []))
    print(f"HTML 已生成: {args.output}")
    print(f"包含 {field_count} 个字段, {len(data.get('reactions', []))} 条联动规则, {len(data.get('risks', []))} 个风险项")


if __name__ == "__main__":
    main()
