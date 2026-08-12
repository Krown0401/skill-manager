import type { SOP } from '../../src/shared/types/sop';

/**
 * 把 SOP 导出为结构化 JSON 字符串
 */
export function exportToJSON(sop: SOP): string {
  return JSON.stringify(sop, null, 2);
}

/**
 * 把 SOP 导出为可读 Markdown（含 frontmatter、Mermaid 流程图、步骤详情表、成功标准）
 */
export function exportToMarkdown(sop: SOP, opts?: { includeFindings?: any[] }): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push(`id: ${sop.id}`);
  lines.push(`name: ${sop.name}`);
  lines.push(`goal: ${sop.goal.replace(/\n/g, ' ')}`);
  lines.push(`version: ${sop.version}`);
  lines.push(`tags: [${sop.tags.join(', ')}]`);
  lines.push(`source: ${sop.source ?? 'unknown'}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${sop.name}`);
  lines.push('');
  lines.push(`> **目标**：${sop.goal}`);
  lines.push('');
  if (sop.explanation) {
    lines.push(`> **编排说明**：${sop.explanation}`);
    lines.push('');
  }
  lines.push('## 流程图（Mermaid）');
  lines.push('');
  lines.push('```mermaid');
  lines.push('flowchart TB');
  const shapeFor = (t: string, id: string, title: string) => {
    const safe = title.replace(/"/g, "'").replace(/\n/g, ' ');
    if (t === 'start') return `  ${id}([start ${safe}])`;
    if (t === 'end') return `  ${id}([end ${safe}])`;
    if (t === 'condition') return `  ${id}{${safe}}`;
    if (t === 'manual') return `  ${id}[[${safe} 👤]]`;
    if (t === 'parallel') return `  ${id}==${safe}==`;
    return `  ${id}[${safe}]`;
  };
  sop.nodes.forEach(n => lines.push(shapeFor(n.type, n.id, n.title)));
  sop.edges.forEach(e => {
    const label = e.condition_label ? `|${e.condition_label}|` : '';
    lines.push(`  ${e.from} --> ${label}${e.to}`);
  });
  lines.push('```');
  lines.push('');
  lines.push('## 节点步骤详情');
  lines.push('');
  lines.push('| # | 类型 | 标题 | 关联 Skill | 描述/人工确认项 |');
  lines.push('|:-:|:----:|-----|:----------:|:----------------|');
  sop.nodes.forEach((n, i) => {
    const typeIcon = { start: '▶', end: '■', skill: '🧩', manual: '👤', condition: '❓', parallel: '≡' }[n.type] ?? n.type;
    const extra = n.type === 'manual' && n.manual_checklist?.length
      ? n.manual_checklist.map(c => `• ${c}`).join('<br>')
      : (n.type === 'skill' ? n.description ?? '' : n.condition_expr ?? n.description ?? '');
    lines.push(`| ${i + 1} | ${typeIcon} ${n.type} | ${n.title} | ${n.skill_id ? '`' + n.skill_id + '`' : '—'} | ${extra.replace(/\|/g, '\\|') || '—'} |`);
  });
  lines.push('');
  lines.push('## 成功标准');
  lines.push('');
  (sop.success_criteria?.length ? sop.success_criteria : ['(无，请人工补充)']).forEach((c, i) => {
    lines.push(`${i + 1}. ${c}`);
  });
  if (opts?.includeFindings?.length) {
    lines.push('');
    lines.push('## 审查优化建议');
    lines.push('');
    opts.includeFindings.forEach((f: any, i: number) => {
      const sevLabel = { critical: '🔴 Critical', warning: '🟡 Warning', suggestion: '🔵 Suggestion' }[f.severity] ?? f.severity;
      lines.push(`${i + 1}. **${sevLabel} · ${f.title}**`);
      if (f.detail) lines.push(`   - ${f.detail.replace(/\n/g, ' ')}`);
      if (f.suggestion) lines.push(`   - 💡 建议：${f.suggestion.replace(/\n/g, ' ')}`);
      if (f.related_node_ids?.length) lines.push(`   - 📍 相关节点：${f.related_node_ids.join(', ')}`);
    });
  }
  lines.push('');
  return lines.join('\n');
}
