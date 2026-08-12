#!/usr/bin/env python3
import argparse
import os
import shutil
import re
from pathlib import Path

def parse_args():
    parser = argparse.ArgumentParser(description="Step 1: 初始化任务文件夹并同步原始资料")
    parser.add_argument("task_name", help="任务名称，格式: {Jira编号}-{医院名称}-{单据简称}")
    return parser.parse_args()

def find_jira_export(jira_id):
    """在 doc 目录下寻找匹配 Jira ID 的导出目录"""
    project_root = Path.cwd()
    doc_dir = project_root / "doc"
    if not doc_dir.exists():
        return None
    
    # 递归搜索匹配 Jira ID 的文件夹
    for p in doc_dir.rglob(f"{jira_id} *"):
        if p.is_dir():
            return p
    return None

def main():
    args = parse_args()
    task_name = args.task_name
    
    # 提取 Jira ID
    match = re.match(r'^([A-Z]+-\d+)', task_name)
    if not match:
        print(f"错误：任务名称格式不正确，需以 Jira 编号开头: {task_name}")
        return
    
    jira_id = match.group(1)
    project_root = Path.cwd()
    task_dir = project_root / "tasks" / task_name
    
    # 1. 创建目录结构
    sub_dirs = ["原始资料", "分析结果", "确认文档", "配置产出"]
    for sd in sub_dirs:
        (task_dir / sd).mkdir(parents=True, exist_ok=True)
    
    print(f"已创建任务目录: {task_dir}")
    
    # 2. 寻找并同步原始资料
    export_dir = find_jira_export(jira_id)
    if export_dir:
        print(f"发现 Jira 导出目录: {export_dir}")
        raw_material_dir = task_dir / "原始资料"
        
        # 同步 index.md
        index_md = export_dir / "index.md"
        if index_md.exists():
            shutil.copy(index_md, raw_material_dir / "index.md")
            print(f"  已同步: index.md")
        
        # 同步 attachments 目录下的所有文件
        attachments_dir = export_dir / "attachments"
        if attachments_dir.exists():
            for f in attachments_dir.iterdir():
                if f.is_file():
                    shutil.copy(f, raw_material_dir / f.name)
                    print(f"  已同步附件: {f.name}")
    else:
        print(f"警告：未能在 doc/ 目录下找到 Jira ID 为 {jira_id} 的导出资料。请确保已执行 Step 0 (jira-fetcher)。")

if __name__ == "__main__":
    main()
