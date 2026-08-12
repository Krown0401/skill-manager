#!/usr/bin/env python3
"""
Jira Task Exporter - 导出 Jira 任务为离线文档

用法:
  python export.py <Jira链接>
  python export.py http://172.18.169.8:6899/browse/YLZHXT-3632

输出格式:
  doc/{version}/{jira_key} {title} {end_type}/
  ├── index.md      # 结构化文档
  └── attachments/  # 附件目录
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

# 导入 lib.jira_client 模块
sys.path.insert(0, str(Path(__file__).parent.parent))
from lib import jira_client

JiraIssue = jira_client.JiraIssue


# ============== 配置加载 ==============

def load_config() -> dict:
    """从 config.yml 加载配置"""
    possible_paths = [
        Path("config.yml"),
        Path(__file__).parent.parent / "config.yml",
    ]
    for config_path in possible_paths:
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                return jira_client.yaml.safe_load(f)
    raise FileNotFoundError("config.yml not found")


def get_project_root() -> Path:
    """获取项目根目录"""
    config = load_config()
    root_dir = config.get("export", {}).get("root_dir", "")
    if root_dir:
        return Path(root_dir)

    # 自动检测：查找包含 doc/ 目录的路径
    current = Path(__file__).resolve()
    for parent in [current.parent, current.parent.parent, current.parent.parent.parent]:
        if (parent / "doc").exists():
            return parent

    # 默认当前目录
    return Path.cwd()


def get_output_dir(issue: JiraIssue, target_end: str = "PC") -> Path:
    """
    计算输出目录路径

    格式: doc/{version}/{jira_key} {title} {end_type}/
    示例: doc/V2.0.3.4/YLZHXT-3627 新增外出进修申请单（PC+移动端）PC+移动端/
    """
    config = load_config()
    export_config = config.get("export", {})

    # 优先使用 Jira 的 fixVersion，其次使用配置默认值
    version = issue.fix_version or export_config.get("version", "1.3.2")
    output_subdir = export_config.get("output_dir", "doc")

    # 清理标题中的特殊字符
    safe_title = re.sub(r'[<>:"/\\|?*]', '', issue.title).strip()
    # 截断过长的标题
    if len(safe_title) > 100:
        safe_title = safe_title[:100]

    dir_name = f"{issue.jira_key} {safe_title} {target_end}"
    return get_project_root() / output_subdir / version / dir_name


def detect_target_end(issue: JiraIssue) -> str:
    """从标题或描述推断目标端"""
    text = f"{issue.title} {issue.description}"
    text_lower = text.lower()

    if any(k in text_lower for k in ['小程序', 'mobile', '移动端', 'h5', 'app']):
        if 'pc' in text_lower or '+' in text:
            return "PC+移动端"
        return "移动端"
    elif '+' in issue.title or 'pc' in text_lower:
        return "PC+移动端"
    else:
        return "PC"


# ============== index.md 生成 ==============

def generate_index_md(issue: JiraIssue, attachments_local: list) -> str:
    """生成结构化 index.md 文档"""

    # 格式化时间
    def fmt_time(ts):
        if not ts:
            return "-"
        dt = datetime.fromisoformat(ts.replace("+0800", "+08:00").replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S")

    # 附件图片列表（排除第一张，因为第一张作为主图）
    image_files = []
    for att in (issue.attachments or []):
        local = next((a["local_path"] for a in attachments_local if a["filename"] == att.filename), None)
        if local and att.mime_type and att.mime_type.startswith("image/"):
            image_files.append({
                "filename": att.filename,
                "local_path": local,
                "is_first": len(image_files) == 0  # 第一张作为主图
            })

    other_images = [img for img in image_files if not img["is_first"]]

    description = issue.description or ""

    lines = []

    # 头部：jira_key 和 标题
    lines.append(issue.jira_key)
    lines.append(f"{issue.title}\n")

    # 基本信息卡片
    lines.append("## 基本信息\n")
    lines.append(f"| 项 | 值 |")
    lines.append(f"| --- | --- |")
    lines.append(f"| Jira 链接 | [{issue.jira_key}]({issue.jira_url}) |")
    lines.append(f"| 状态 | {issue.status} |")
    lines.append(f"| 版本 | {issue.fix_version or '-'} |")
    lines.append(f"| 优先级 | {issue.priority} |")
    lines.append(f"| 类型 | {issue.issue_type} |")
    lines.append(f"| 经办人 | {issue.assignee or '-'} |")
    lines.append(f"| 报告人 | {issue.reporter or '-'} |")
    lines.append(f"| 创建时间 | {fmt_time(issue.created)} |")
    lines.append(f"| 更新时间 | {fmt_time(issue.updated)} |")
    lines.append("")

    # 完整的 description 内容
    if description:
        lines.append("## 任务描述\n")
        # 保留原始格式，只做清理
        desc_lines = description.split('\n')
        for line in desc_lines:
            # 跳过空行和简单的分隔符
            if line.strip() and not line.strip().startswith('---'):
                lines.append(line)
        lines.append("")

    # 界面截图
    if image_files:
        lines.append("## 界面截图\n")
        # 第一张图片
        first_img = image_files[0]
        lines.append(f"![{first_img['filename']}](attachments/{first_img['filename']})")
        lines.append(f"\n{issue.title}\n")
        # 其他图片
        if len(image_files) > 1:
            lines.append("\n## 其他截图\n")
            for img in image_files[1:]:
                lines.append(f"![{img['filename']}](attachments/{img['filename']})")

    return "\n".join(lines)


def parse_field_table(description: str) -> list:
    """从 description 中解析字段表格"""
    # 尝试匹配 Markdown 表格格式
    table_match = re.search(r'\|\s*序号\s*\|.*?\n\|\s*:-.*?\n((?:\|.+\n)+)', description, re.DOTALL)
    if not table_match:
        return []

    rows = []
    for line in table_match.group(1).strip().split('\n'):
        cols = [c.strip() for c in line.split('|')[1:-1]]
        if len(cols) >= 4:
            rows.append({
                "name": cols[1] if len(cols) > 1 else "",
                "code": cols[2] if len(cols) > 2 else "",
                "desc": cols[3] if len(cols) > 3 else "",
                "type": cols[4] if len(cols) > 4 else "",
                "required": cols[5] if len(cols) > 5 else "",
            })
    return rows


# ============== 下载附件 ==============

def download_attachments(issue: JiraIssue, output_dir: str) -> list:
    """下载所有附件到本地，返回本地路径信息"""
    downloaded = []
    att_dir = Path(output_dir) / "attachments"
    att_dir.mkdir(parents=True, exist_ok=True)

    client = jira_client.JiraClient(
        url=jira_client.JIRA_BASE_URL,
        username=jira_client.AUTH_USERNAME,
        password=jira_client.AUTH_PASSWORD
    )
    client.login()

    for att in (issue.attachments or []):
        local_path = att_dir / att.filename
        try:
            print(f"  下载: {att.filename}")
            response = client.session.get(att.url, timeout=30)
            if response.status_code == 200:
                with open(local_path, "wb") as f:
                    f.write(response.content)
                downloaded.append({
                    "filename": att.filename,
                    "local_path": str(local_path),
                    "size": att.size,
                    "success": True
                })
                print(f"    -> {local_path} ({att.size / 1024:.1f} KB)")
            else:
                print(f"    下载失败: {response.status_code}")
                downloaded.append({
                    "filename": att.filename,
                    "local_path": None,
                    "size": att.size,
                    "success": False
                })
        except Exception as e:
            print(f"    异常: {e}")
            downloaded.append({
                "filename": att.filename,
                "local_path": None,
                "size": att.size,
                "success": False
            })

    return downloaded


# ============== 主流程 ==============

def export_jira(jira_url: str) -> dict:
    """导出 Jira 任务为离线文档"""
    print(f"正在获取 Jira 任务: {jira_url}")

    # 1. 获取任务数据
    issue = jira_client.fetch_jira_info(jira_url)

    # 2. 确定目标端
    target_end = detect_target_end(issue)
    print(f"目标端: {target_end}")

    # 3. 计算输出目录
    output_dir = get_output_dir(issue, target_end)
    print(f"输出目录: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)

    # 4. 下载附件
    print(f"\n正在下载附件...")
    downloaded = download_attachments(issue, str(output_dir))

    # 5. 生成 index.md
    print(f"\n正在生成文档...")
    index_content = generate_index_md(issue, downloaded)
    index_path = output_dir / "index.md"
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_content)
    print(f"  index.md: {index_path}")

    return {
        "jira_key": issue.jira_key,
        "output_dir": str(output_dir),
        "attachments_downloaded": downloaded,
    }


# ============== CLI ==============

def parse_args():
    parser = argparse.ArgumentParser(description="导出 Jira 任务为离线文档")
    parser.add_argument("jira_url", nargs="?", help="Jira 任务链接")
    return parser.parse_args()


def main():
    args = parse_args()

    if not args.jira_url:
        print("用法: python export.py <Jira链接>")
        print("示例: python export.py http://172.18.169.8:6899/browse/YLZHXT-3632")
        sys.exit(1)

    try:
        result = export_jira(args.jira_url)

        print("\n" + "=" * 60)
        print(f"导出完成!")
        print(f"Jira Key: {result['jira_key']}")
        print(f"输出目录: {result['output_dir']}")
        success_count = sum(1 for a in result['attachments_downloaded'] if a['success'])
        total_count = len(result['attachments_downloaded'])
        print(f"附件下载: {success_count}/{total_count}")
        print("=" * 60)

    except Exception as e:
        print(f"导出失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()