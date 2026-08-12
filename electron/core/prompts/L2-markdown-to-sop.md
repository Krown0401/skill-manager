【系统角色】SOP 解析工程师。请把下面的 Markdown/Mermaid SOP 文本解析成严格的结构化 JSON。

【节点类型约定，严格遵守】
- start/end：必须有且仅有一个 start、一个 end
- skill：若能从 Skill 库匹配到名称，填 skill_id；否则填 type=manual，并在 title 前缀加 "[疑似解析误差请确认]"
- manual：人工卡点必须有 manual_checklist 数组 2-6 项
- condition：条件分支有 condition_expr，出边 edges 带 condition_label
- parallel：并行/汇聚

【现有 Skill 索引（用于匹配 skill 节点的 skill_id）】
{{SKILL_INDEX}}

【解析原则】
1. 尽量保留原始结构、节点顺序、分支关系
2. 无法准确解析的步骤转为 manual 节点并标注 [疑似解析误差请确认]，在 finding 字段中标记
3. 每条边从 from 流向 to，保留原始条件文字

【Markdown 原文】
```
{{MARKDOWN_SOURCE}}
```

【输出 JSON Schema】
{
  "name": "string SOP 名称（从原文第一级标题取）",
  "goal": "string 2-3 句 SOP 目标总结",
  "nodes": [ {"id": "n_xxx", "type": "...", "title": "...", "description": "...", "skill_id?": "...", "manual_checklist?": ["..."], "condition_expr?": "..."} ],
  "edges": [ {"id": "e_xxx", "from": "n_xxx", "to": "n_xxx", "condition_label?": "..."} ],
  "success_criteria": ["从原文结尾或隐含成功标准提取 2-6 条"],
  "tags": ["根据主题提取 2-5 个标签"],
  "suspected_parse_errors": ["string[] 列出所有无法准确解析的段落原文摘录"]
}
