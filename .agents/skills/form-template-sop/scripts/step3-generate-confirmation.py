#!/usr/bin/env python3
"""Step 3: 生成确认文档

读取 Step 3e 合并后的 enriched JSON，生成标准化的 Markdown 确认文档。

用法:
  python3 step3-generate-confirmation.py \
    --enriched <enriched.json> \
    --output <确认文档.md>

  # 可选的独立字典数据
  python3 step3-generate-confirmation.py \
    --enriched <enriched.json> \
    --dictionaries <dict-result.json> \
    --output <确认文档.md>

输入 JSON 格式（由 AI 在 Step 3e 合并产生）：
  - task_info: 任务元信息（jira_id, hospital, form_name, version）
  - reference: 参考单据信息（certCode, certName）
  - data_fetch: （可选）接口取数结果
  - header: 单据头部元数据行
  - sections: 原始 sections（含 grid/table 类型）
  - fields_verified: 表单字段（含 pc_component, mobile_component, _source, _dictCheck）
  - table_fields: 表格分区字段
  - template_components: （可选）模板组件引用
  - dictionaries: 字典搜索结果
  - reactions: 联动关系
  - risks: 风险项（含 severity）
  - pc_mobile_diff: PC/移动端差异
"""

import argparse
import json
import os
import sys
from datetime import datetime


def parse_args():
    parser = argparse.ArgumentParser(description="生成确认文档（Step 3）")
    parser.add_argument(
        "--enriched", required=True,
        help="Step 3e 合并后的 enriched JSON 路径"
    )
    parser.add_argument(
        "--output", required=True,
        help="确认文档输出路径（.md）"
    )
    parser.add_argument(
        "--dictionaries",
        help="（可选）独立的字典搜索结果 JSON"
    )
    return parser.parse_args()


def load_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


# ── helpers ──

def req(v):
    """返回 '是' 或 '否'"""
    return "是" if v else "否"


def severity_label(s):
    """风险等级 → 图标 + 中文"""
    m = {"blocker": "❌ 阻塞", "high": "⚠️ 高风险", "low": "ℹ️ 低风险"}
    return m.get(s, s)


def dict_status_icon(severity):
    """字典校验状态 → 图标"""
    m = {"existing": "✅", "not_found": "⚠️", "need_new": "❌"}
    return m.get(severity, "—")


def source_label(src):
    """来源标识"""
    labels = {
        "接口确认": "✅ 接口确认",
        "截图推测": "📷 截图推测",
        "模板组件": "🧩 模板组件",
        "待新建": "🆕 待新建",
        "参考单据确认": "📄 参考单据确认",
        "同医院推测": "🏥 同医院推测",
    }
    return labels.get(src, src or "")


def source_sort_key(src):
    """来源排序：接口确认 > 截图推测 > 参考单据 > 模板组件 > 待新建"""
    order = {"接口确认": 0, "截图推测": 1, "参考单据确认": 2, "模板组件": 3, "待新建": 4}
    return order.get(src, 99)


def make_field_row(seq, title, name, pc_comp, mobile_comp, required, source,
                   dict_info, grid_span, notes=""):
    """生成单行字段表格行。dict_info 为 _dictCheck 对象或 None"""
    title_str = f"**{title}**" if required else title
    source_str = source_label(source)

    # 字典状态
    dict_str = "—"
    if dict_info:
        found = dict_info.get("found")
        if found is True:
            codes = ", ".join(
                f"{d.get('dictCode','')}" for d in (dict_info.get("options") or [])
                if d.get("leaves") and len(d.get("leaves", [])) > 0
            )
            dict_str = f"✅ {codes}" if codes else "✅ 存在"
        elif found is False:
            dict_str = "❌ 需新建"

    # 备注
    note_str = notes or ""
    if note_str:
        note_str = note_str.replace("|", "\\|")

    return f"| {seq} | {title_str} | {name} | {pc_comp} | {mobile_comp} | {required} | {source_str} | {dict_str} |"


# ── section generators ──

def gen_header_meta(header):
    """渲染单据头部元数据行"""
    lines = []
    lines.append(f"### {header.get('formTitle', header.get('title', '单据头部'))}")
    status = header.get("status", "")
    if status:
        lines.append(f"> 状态标签：`{status}`\n")
    meta_fields = header.get("fields", [])
    if meta_fields:
        pairs = []
        for f in meta_fields:
            label = f.get("label", "")
            value = f.get("value", "")
            auto = f.get("auto", False)
            val = value if not auto else f"{value}（自动带出）"
            pairs.append(f"**{label}**：{val}")
        lines.append("> " + " | ".join(pairs))
    lines.append("")
    return "\n".join(lines)


def gen_field_tables(fields_verified, sections, terminal="PC+移动端"):
    """生成字段清单。含分组和表头"""
    lines = []

    # 从 sections 中获取分组信息（非 table 类型）
    form_sections = [s for s in (sections or []) if s.get("type") != "table"]
    if form_sections:
        for sec in form_sections:
            title = sec.get("title", "")
            grid = sec.get("grid", 3)
            sec_fields = sec.get("fields", [])
            summary = sec.get("summary", [])
            lines.append(f"### {title}")

            # 渲染汇总字段（如有）
            if summary:
                sum_parts = [f"**{s.get('label','')}**：{s.get('value','')}" for s in summary]
                lines.append("> " + " | ".join(sum_parts) + "\n")

            lines.append(f"> 栅格：{grid} 列 | 目标端：{terminal}\n")
            lines.append(_field_table_header())
            has_data = False
            for idx, sf in enumerate(sec_fields, 1):
                # 从 fields_verified 找匹配
                fv = _find_field(sf, fields_verified)
                if fv:
                    has_data = True
                    lines.append(make_field_row(
                        seq=idx,
                        title=fv.get("title", sf.get("title", "")),
                        name=fv.get("name", sf.get("name", "")),
                        pc_comp=fv.get("pc_component", sf.get("component", "待确认")),
                        mobile_comp=fv.get("mobile_component", sf.get("component", "待确认")),
                        required=req(fv.get("required", sf.get("required", False))),
                        source=fv.get("_source", "截图推测"),
                        dict_info=fv.get("_dictCheck"),
                        grid_span=fv.get("pc_gridSpan", sf.get("gridSpan", 1)),
                        notes=fv.get("notes", ""),
                    ))
            if not has_data:
                # fallback: 直接用 section fields
                for idx, sf in enumerate(sec_fields, 1):
                    has_data = True
                    fv = _find_field(sf, fields_verified)
                    info = fv or sf
                    lines.append(make_field_row(
                        seq=idx,
                        title=info.get("title", sf.get("title", "")),
                        name=info.get("name", sf.get("name", "")),
                        pc_comp=info.get("pc_component", sf.get("component", "待确认")),
                        mobile_comp=info.get("mobile_component", sf.get("component", "待确认")),
                        required=req(info.get("required", sf.get("required", False))),
                        source=info.get("_source", "截图推测"),
                        dict_info=info.get("_dictCheck"),
                        grid_span=info.get("pc_gridSpan", sf.get("gridSpan", 1)),
                        notes=info.get("notes", ""),
                    ))
            if not has_data:
                lines.append("| — | 暂无语义字段 | | | | | | |\n")
            lines.append("")
    else:
        # fallback: 直接用 fields_verified
        if fields_verified:
            lines.append("### 表单字段\n")
            lines.append(_field_table_header())
            for idx, fv in enumerate(fields_verified, 1):
                lines.append(make_field_row(
                    seq=idx,
                    title=fv.get("title", ""),
                    name=fv.get("name", ""),
                    pc_comp=fv.get("pc_component", fv.get("component", "待确认")),
                    mobile_comp=fv.get("mobile_component", fv.get("component", "待确认")),
                    required=req(fv.get("required", False)),
                    source=fv.get("_source", "截图推测"),
                    dict_info=fv.get("_dictCheck"),
                    grid_span=fv.get("pc_gridSpan", 1),
                    notes=fv.get("notes", ""),
                ))
            lines.append("")

    return "\n".join(lines)


def _field_table_header():
    return "| 序号 | 标题 | 字段名 | PC 组件 | 移动端组件 | 必填 | 来源 | 字典 |\n| --- | --- | --- | --- | --- | :---: | --- | --- |"


def _find_field(section_field, fields_verified):
    """在 fields_verified 中匹配 section field（按 name 或 title）"""
    name = section_field.get("name", "")
    title = section_field.get("title", "")
    for fv in (fields_verified or []):
        if name and fv.get("name") == name:
            return fv
        if title and fv.get("title") == title:
            return fv
    return None


def gen_table_sections(table_fields):
    """渲染表格分区"""
    if not table_fields:
        return ""
    lines = []
    for tbl in table_fields:
        title = tbl.get("tableTitle", tbl.get("title", ""))
        columns = tbl.get("columns", [])
        fields = tbl.get("fields", [])

        lines.append(f"### {title}\n")
        # 列定义
        if columns:
            col_count = len(columns)
            lines.append(f"> 表格列数：{col_count} 列")
            col_details = []
            for c in columns:
                c_title = c.get("title", "")
                c_req = "必填" if c.get("required") else "可选"
                c_width = c.get("width", "auto")
                col_details.append(f"{c_title}({c_req})")
            lines.append("> " + " | ".join(col_details))
        lines.append("")

        if fields:
            lines.append(_field_table_header())
            for idx, fv in enumerate(fields, 1):
                lines.append(make_field_row(
                    seq=idx,
                    title=fv.get("title", ""),
                    name=fv.get("name", ""),
                    pc_comp=fv.get("pc_component", "待确认"),
                    mobile_comp=fv.get("mobile_component", "待确认"),
                    required=req(fv.get("required", False)),
                    source=fv.get("_source", "截图推测"),
                    dict_info=fv.get("_dictCheck"),
                    grid_span=fv.get("pc_gridSpan", 1),
                    notes=fv.get("notes", ""),
                ))
            lines.append("")
        else:
            # 无字段时只展示列结构
            lines.append("| 序号 | 列名 | 必填 | 宽度 |")
            lines.append("| --- | --- | :---: | --- |")
            for ci, c in enumerate(columns, 1):
                lines.append(f"| {ci} | {c.get('title','')} | {req(c.get('required',False))} | {c.get('width','auto')} |")
            lines.append(f"\n> ℹ️ 行数据由运行时动态生成，字段映射待确认\n")

    return "\n".join(lines)


def gen_template_components(templates):
    """渲染模板组件引用"""
    if not templates:
        return (
            "> 本单据暂未匹配到项目中已有的模板组件。\n"
            "> 请在配置阶段搜索 `模板组件/` 目录下是否有可复用的组件（如 `TaxBaseProjectInfo`/`RsProjectInfo` 预算项目组件）。\n"
        )
    lines = [
        "> 优先复用项目中已有的模板组件，避免内联重复编写\n",
        "| 区域 | PC 模板 | 移动端模板 | 引用路径 |",
        "| --- | --- | --- | --- |",
    ]
    for t in templates:
        lines.append(f"| {t.get('area', '')} | `{t.get('pc_template', '')}` | `{t.get('mobile_template', '')}` | {t.get('ref_path', '')} |")
    lines.append("")
    return "\n".join(lines)


def gen_dictionary_validation(dict_data):
    """渲染字典校验表"""
    if not dict_data:
        return "> 字典数据待补充\n"
    lines = [
        "| 字段名 | 查询关键字 | 匹配数 | 编码 | 枚举值 | 状态 |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for field_name, info in dict_data.items():
        match_count = info.get("matchCount", 0)
        items = info.get("items", [])
        if match_count > 0:
            # 取第一个有 leaves 的
            best = None
            for item in items:
                leaves = item.get("leaves", [])
                if leaves:
                    best = item
                    break
            if not best and items:
                best = items[0]
            if best:
                code = best.get("dictCode", "")
                dict_name = best.get("dictName", "")
                leaves = best.get("leaves", [])
                leaf_labels = [f"{l.get('label','')}({l.get('value','')})" for l in leaves[:5]]
                leaf_str = "、".join(leaf_labels)
                if len(leaves) > 5:
                    leaf_str += f"…（共{len(leaves)}项）"
                status = "✅ 存在" if leaves else "⚠️ 未查到"
                if not leaves:
                    status = "⚠️ 无叶子节点"
            else:
                code = "—"
                dict_name = ""
                leaf_str = "—"
                status = "⚠️ 未查到"
        else:
            code = "—"
            dict_name = ""
            leaf_str = "—"
            status = "❌ 未查到"
        lines.append(f"| {field_name} | {dict_name} | {match_count} | {code} | {leaf_str} | {status} |")
    lines.append("")
    return "\n".join(lines)


def gen_reactions(reactions):
    """渲染联动关系"""
    if not reactions:
        return "> 联动关系待补充\n"
    lines = [
        "| 类型 | 描述 | 来源 |",
        "| --- | --- | --- |",
    ]
    for r in reactions:
        rtype = r.get("type", "")
        desc = r.get("description", "")
        src = r.get("source", "截图推测")
        lines.append(f"| {rtype} | {desc} | {src} |")
    lines.append("")
    return "\n".join(lines)


def gen_risks(risks):
    """渲染风险项"""
    if not risks:
        return "> 暂未识别到显著风险项\n"
    sections = {"blocker": [], "high": [], "low": []}
    for r in risks:
        sev = r.get("severity", "high")
        sections.setdefault(sev, []).append(r)

    lines = []
    has_any = False
    for sev, label in [("blocker", "❌ 阻塞"), ("high", "⚠️ 高风险"), ("low", "ℹ️ 低风险")]:
        items = sections.get(sev, [])
        if not items and sev != "low":
            items = [r for r in risks if r.get("severity") not in ("blocker", "high", "low") and sev == "high"]
        if items:
            has_any = True
            lines.append(f"### {label}\n")
            for i, r in enumerate(items, 1):
                rtype = r.get("type", "风险")
                desc = r.get("description", "")
                lines.append(f"{i}. **{rtype}**：{desc}")
            lines.append("")

    if not has_any:
        lines.append("> 暂未识别到显著风险项\n")

    return "\n".join(lines)


def gen_pc_mobile_diff(diff):
    """渲染 PC vs 移动端差异"""
    if not diff:
        return ""
    lines = []
    layout = diff.get("layout", [])
    component = diff.get("component", [])
    if layout:
        lines.append("### 布局差异\n")
        for item in layout:
            lines.append(f"- {item}")
        lines.append("")
    if component:
        lines.append("### 组件差异\n")
        for item in component:
            lines.append(f"- {item}")
        lines.append("")
    return "\n".join(lines)


def gen_review_checklist():
    return """| 项 | 确认 | 备注 |
| --- | :---: | --- |
| **阻塞项已解决** | [ ] | 新建凭证 + 新建字典等阻塞项已处理 |
| 字段名称与 UI 一致 | [ ] | |
| 字段顺序与 UI 一致 | [ ] | |
| PC/移动端组件选择正确 | [ ] | |
| 模板组件已引用 | [ ] | |
| 必填标识与 UI 一致 | [ ] | |
| 联动关系描述准确 | [ ] | |
| 字典编码在目标医院存在 | [ ] | |

**Review 人：** （签名）  **确认日期：** （日期）
"""


# ── counters ──

def count_stats(fields_verified, table_fields, dict_data, risks):
    """统计来源分布、字典状态、风险等级"""
    sources = {}
    dict_statuses = {"existing": 0, "not_found": 0, "need_new": 0}
    risk_severities = {"blocker": 0, "high": 0, "low": 0}

    all_fields = list(fields_verified or [])
    for tbl in (table_fields or []):
        all_fields.extend(tbl.get("fields", []) or [])

    for fv in all_fields:
        src = fv.get("_source", "截图推测")
        sources[src] = sources.get(src, 0) + 1

        dc = fv.get("_dictCheck")
        if dc:
            if dc.get("found") is True:
                dict_statuses["existing"] += 1
            elif dc.get("found") is False:
                dict_statuses["need_new"] += 1
            else:
                dict_statuses["not_found"] += 1

    for r in (risks or []):
        sev = r.get("severity", "high")
        if sev in risk_severities:
            risk_severities[sev] += 1

    return sources, dict_statuses, risk_severities


def gen_visual_reference(task_dir):
    """渲染视觉参考（截图）"""
    if not task_dir:
        return ""
    
    raw_dir = os.path.join(task_dir, "原始资料")
    if not os.path.exists(raw_dir):
        return ""
    
    lines = ["## 二、界面截图 (Visual Reference)\n"]
    
    # 查找 PC 和 Mobile 截图
    pc_imgs = []
    mobile_imgs = []
    other_imgs = []
    
    files = sorted(os.listdir(raw_dir))
    for f in files:
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            fname = f.lower()
            rel_path = f"../原始资料/{f}"
            if any(kw in fname for kw in ["pc", "电脑", "desktop", "web"]):
                pc_imgs.append((f, rel_path))
            elif any(kw in fname for kw in ["mobile", "移动", "phone", "app", "h5"]):
                mobile_imgs.append((f, rel_path))
            else:
                other_imgs.append((f, rel_path))
    
    if pc_imgs:
        lines.append("### PC 端截图")
        for name, path in pc_imgs:
            lines.append(f"![PC端截图]({path})\n")
            lines.append(f"> 来源文件: `{name}`\n")
            
    if mobile_imgs:
        lines.append("### 移动端截图")
        for name, path in mobile_imgs:
            lines.append(f"![移动端截图]({path})\n")
            lines.append(f"> 来源文件: `{name}`\n")
            
    if not pc_imgs and not mobile_imgs and other_imgs:
        lines.append("### 界面截图")
        for name, path in other_imgs:
            lines.append(f"![截图]({path})\n")
            lines.append(f"> 来源文件: `{name}`\n")
            
    if not (pc_imgs or mobile_imgs or other_imgs):
        lines.append("> 暂未发现截图文件\n")
        
    return "\n".join(lines)


# ── main generator ──

def generate_confirmation(data, task_dir=None):
    """生成确认文档 Markdown 内容"""
    task_info = data.get("task_info", {})
    reference = data.get("reference", {})
    data_fetch = data.get("data_fetch", {})
    header = data.get("header", {})
    sections = data.get("sections", [])
    fields_verified = data.get("fields_verified", [])
    table_fields = data.get("table_fields", [])
    template_components = data.get("template_components", [])
    dictionaries = data.get("dictionaries", {})
    reactions = data.get("reactions", [])
    risks = data.get("risks", [])
    pc_mobile_diff = data.get("pc_mobile_diff", {})

    form_name = task_info.get("form_name", "未知单据")
    jira_id = task_info.get("jira_id", "")
    hospital = task_info.get("hospital", "")
    version = task_info.get("version", "")
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = []

    # ── 标题 ──
    lines.append(f"# 确认文档：{form_name}\n")
    meta_parts = [f"生成时间：{now}"]
    if jira_id:
        meta_parts.append(f"Jira: {jira_id}")
    if version:
        meta_parts.append(f"版本: {version}")
    if hospital:
        meta_parts.append(f"目标医院: {hospital}")
    meta_parts.append("状态：待人工 Review")
    lines.append("> " + " | ".join(meta_parts) + "\n")

    lines.append("---\n")

    # ── 一、任务元信息 ──
    lines.append("## 一、任务元信息\n")
    lines.append("| 项 | 值 |")
    lines.append("| --- | --- |")
    lines.append(f"| Jira 编号 | {jira_id} |")
    lines.append(f"| 目标医院 | **{hospital}** |")
    cert_code = reference.get("certCode", "")
    cert_name = reference.get("certName", "")
    if cert_code:
        lines.append(f"| 参考单据 | {cert_name} ({cert_code}) |")
    terminal = task_info.get("terminal", "PC + 移动端")
    lines.append(f"| 目标端 | {terminal} |")
    if reference.get("totalFields"):
        lines.append(f"| 参考单据字段数 | {reference.get('totalFields')} |")
    lines.append("")

    # ── 二、界面截图 ──
    if task_dir:
        lines.append(gen_visual_reference(task_dir))

    # ── 三、接口取数结果 ──
    if data_fetch:
        lines.append("## 三、接口取数结果\n")
        lines.append("| 步骤 | 结果 |")
        lines.append("| --- | --- |")
        for key, val in data_fetch.items():
            key_label = {"login": "登录目标医院", "cert_search": "搜索凭证", "dict_query": "字典查询"}.get(key, key)
            lines.append(f"| {key_label} | {val} |")
        lines.append("")

    # ── 四、字段清单 ──
    lines.append("## 四、字段清单\n")

    # 渲染单据头部（元数据行）
    if header:
        lines.append(gen_header_meta(header))

    field_content = gen_field_tables(fields_verified, sections, terminal)
    lines.append(field_content)

    # ── 五、字段清单 — 表格子表 ──
    table_content = gen_table_sections(table_fields)
    if table_content:
        lines.append("## 五、字段清单 — 表格子表\n")
        lines.append(table_content)

    # ── 六、模板组件引用 ──
    if template_components:
        lines.append("## 六、模板组件引用\n")
        lines.append(gen_template_components(template_components))
    elif dictionaries or fields_verified:
        # 如果有字典或字段数据但没模板组件，加个提示
        lines.append("## 六、模板组件引用\n")
        lines.append(gen_template_components(None))

    # ── 七、字典校验 ──
    if dictionaries:
        lines.append("## 七、字典校验\n")
        lines.append(gen_dictionary_validation(dictionaries))

    # ── 八、联动关系 ──
    if reactions:
        lines.append(f"## 八、联动关系\n")
        lines.append(gen_reactions(reactions))

    # ── 九、风险项 ──
    if risks:
        section_num = 9
        lines.append(f"## {section_num}、风险项\n")
        lines.append(gen_risks(risks))

    # ── 十、PC vs 移动端差异 ──
    section_num = 10
    lines.append(f"## {section_num}、PC vs 移动端差异\n")
    diff_content = gen_pc_mobile_diff(pc_mobile_diff)
    if diff_content:
        lines.append(diff_content)
    else:
        lines.append("> PC 和移动端布局及组件差异待确认\n")

    # ── Review确认 ──
    lines.append("---\n")
    lines.append("## Review 确认\n")
    lines.append(gen_review_checklist())

    return "\n".join(lines)


# ── entry ──

def main():
    args = parse_args()

    if not os.path.exists(args.enriched):
        print(f"错误：enriched 文件不存在: {args.enriched}")
        sys.exit(1)

    data = load_json(args.enriched)
    
    # 自动推断 task_dir (enriched.json 通常在 tasks/<task_name>/分析结果/ 下)
    task_dir = os.path.dirname(os.path.dirname(os.path.abspath(args.enriched)))

    # 合并可选的字典数据
    if args.dictionaries:
        if not os.path.exists(args.dictionaries):
            print(f"错误：字典文件不存在: {args.dictionaries}")
            sys.exit(1)
        dict_data = load_json(args.dictionaries)
        if "dictionaries" not in data or not data["dictionaries"]:
            data["dictionaries"] = dict_data

    content = generate_confirmation(data, task_dir)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(content)

    # 输出统计
    fields_verified = data.get("fields_verified", [])
    table_fields = data.get("table_fields", [])
    dict_data = data.get("dictionaries", {})
    risks = data.get("risks", [])
    sources, dict_statuses, risk_sevs = count_stats(fields_verified, table_fields, dict_data, risks)

    total = sum(sources.values()) or 0
    src_parts = " | ".join(f"{k}: {v}" for k, v in sorted(sources.items(), key=lambda x: source_sort_key(x[0])))
    dict_parts = " | ".join(
        f"{'✅' if k=='existing' else '⚠️' if k=='not_found' else '❌'} {v}"
        for k, v in dict_statuses.items() if v > 0
    )
    risk_parts = " | ".join(
        f"{'❌' if k=='blocker' else '⚠️' if k=='high' else 'ℹ️'} 高风险 {v}" if k == "high"
        else f"{'❌' if k=='blocker' else '⚠️' if k=='high' else 'ℹ️'} {v}"
        for k, v in risk_sevs.items() if v > 0
    )

    print(f"已生成确认文档: {args.output}")
    print(f"字段总数: {total} | {src_parts}")
    if dict_parts:
        print(f"字典匹配: {dict_parts}")
    if risk_parts:
        print(f"风险项: {risk_parts}")


if __name__ == "__main__":
    main()
