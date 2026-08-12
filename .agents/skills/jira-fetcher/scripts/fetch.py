#!/usr/bin/env python3
"""
Jira Fetcher - 获取 Jira 任务详情

用法:
  python fetch.py <Jira链接> [--raw]
  python fetch.py http://172.18.169.8:6899/browse/YLZHXT-3632 --raw
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from lib import jira_client


def main():
    parser = argparse.ArgumentParser(description="获取 Jira 任务详情")
    parser.add_argument("jira_url", nargs="?", help="Jira 任务链接")
    parser.add_argument("--raw", action="store_true", help="输出 Jira API 原始格式")
    args = parser.parse_args()

    if not args.jira_url:
        print("用法: python fetch.py <Jira链接> [--raw]")
        print("示例: python fetch.py http://172.18.169.8:6899/browse/YLZHXT-3632")
        sys.exit(1)

    try:
        issue = jira_client.fetch_jira_info(args.jira_url)

        if args.raw:
            print(json.dumps(jira_client.to_raw(issue), ensure_ascii=False, indent=2))
        else:
            print(json.dumps(jira_client.to_dict(issue), ensure_ascii=False, indent=2))

    except Exception as e:
        print(f"获取失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
