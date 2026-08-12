#!/usr/bin/env python3
"""Step 2a: AI 分析 UI（参考实现）

实际使用中，AI 直接查看截图输出 analysis-result.json，不依赖本脚本。
本脚本作为 MiniMax API 调用的参考实现，输出格式见 analysis-result.json。

分析产出后，使用 generate-html-from-analysis.py 生成 HTML 可视化。

用法:
  python step2-analyze-ui.py --screenshot <截图路径> --output <分析结果.json>
  python step2-analyze-ui.py --screenshot <截图路径> --output <输出路径> --prompt <自定义提示文件>
"""

import argparse
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib.api_client import MiniMaxClient


def parse_args():
    parser = argparse.ArgumentParser(description="AI 分析 UI 截图")
    parser.add_argument(
        "--screenshot", required=True, help="UI 截图文件路径"
    )
    parser.add_argument(
        "--output", required=True, help="分析结果输出路径（JSON）"
    )
    parser.add_argument(
        "--prompt", help="自定义分析提示文件路径（可选，纯文本格式）"
    )
    return parser.parse_args()


def load_prompt(prompt_path):
    """从文件加载自定义提示"""
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read().strip()


def main():
    args = parse_args()

    if not os.path.exists(args.screenshot):
        print(f"错误：截图文件不存在: {args.screenshot}")
        sys.exit(1)

    prompt = None
    if args.prompt:
        if not os.path.exists(args.prompt):
            print(f"错误：提示文件不存在: {args.prompt}")
            sys.exit(1)
        prompt = load_prompt(args.prompt)

    print(f"正在分析截图: {args.screenshot}")
    client = MiniMaxClient()
    result = client.analyze_ui(args.screenshot, prompt=prompt)

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    field_count = len(result.get("fields", []))
    print(f"分析完成！共识别 {field_count} 个字段")
    print(f"结果已保存到: {args.output}")


if __name__ == "__main__":
    main()
