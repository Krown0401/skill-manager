import { ipcMain, dialog } from 'electron';
import path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getStorage } from './storage';
import type { Skill } from '../../src/shared/types/skill';
import type { SOP } from '../../src/shared/types/sop';
import type { ReviewDimension } from '../../src/shared/types/review';
import { scanSkillDirectory } from './skill-scanner';
import { callLlm, testLlmConnection as llmTest } from './llm-client';
import { applyAutoLayout } from './sop-layout';
import { DEFAULT_DIMENSIONS } from '../../src/shared/constants/dimensions';
import { exportToJSON, exportToMarkdown } from './sop-exporter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function readPrompt(name: string): string {
  return fs.readFileSync(path.join(__dirname, 'prompts', name + '.md'), 'utf-8');
}

function safePath(userPath: string): string {
  const normalized = path.normalize(userPath);
  if (!path.isAbsolute(normalized)) {
    throw new Error('Path must be absolute: ' + userPath);
  }
  return normalized;
}

const L1Schema = z.object({
  tags: z.array(z.string()).default([]),
  preconditions: z.array(z.string()).default([]),
  side_effects: z.array(z.string()).default([]),
  estimated_duration: z.string().nullable().default(null),
  related_skill_hints: z.array(z.string()).default([]),
  input_schema: z.record(z.any()).nullable().default(null),
  output_schema: z.record(z.any()).nullable().default(null)
});

const SOPNodeSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().startsWith('n_'), type: z.literal('start'), title: z.string() }),
  z.object({ id: z.string().startsWith('n_'), type: z.literal('end'), title: z.string() }),
  z.object({ id: z.string().startsWith('n_'), type: z.literal('skill'), title: z.string(), skill_id: z.string(), description: z.string().optional(), input_mapping: z.record(z.string()).optional(), output_alias: z.record(z.string()).optional() }),
  z.object({ id: z.string().startsWith('n_'), type: z.literal('manual'), title: z.string(), manual_checklist: z.array(z.string()).min(1) }),
  z.object({ id: z.string().startsWith('n_'), type: z.literal('condition'), title: z.string(), condition_expr: z.string() }),
  z.object({ id: z.string().startsWith('n_'), type: z.literal('parallel'), title: z.string() })
]);
const EdgeSchema = z.object({ id: z.string().startsWith('e_'), from: z.string().startsWith('n_'), to: z.string().startsWith('n_'), condition_label: z.string().optional() });
const SOPSchema = z.object({
  name: z.string().min(1),
  nodes: z.array(SOPNodeSchema).min(2),
  edges: z.array(EdgeSchema).min(1),
  success_criteria: z.array(z.string()).min(1),
  tags: z.array(z.string()),
  explanation: z.string().optional()
});

const ImportNodeSchema = z.union([
  SOPNodeSchema,
  z.object({ id: z.string().startsWith('n_'), type: z.literal('skill'), title: z.string(), skill_hint: z.string(), description: z.string().optional() })
]);
const ImportSOPSchema = z.object({
  name: z.string().min(1),
  goal: z.string().optional(),
  nodes: z.array(ImportNodeSchema as any).min(2),
  edges: z.array(EdgeSchema).min(1),
  success_criteria: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  suspected_parse_errors: z.array(z.string()).default([])
});

const FindingSchema = z.object({
  id: z.string(),
  severity: z.enum(['critical', 'warning', 'suggestion']),
  dimension: z.string(),
  title: z.string(),
  detail: z.string(),
  related_node_ids: z.array(z.string()).optional(),
  suggestion: z.string().optional(),
  suspected_parse_error: z.boolean().optional()
});
const DimBlockSchema = z.object({ score: z.number().int().min(0).max(100), findings: z.array(FindingSchema).default([]) });
const ReviewResultSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  dimension_scores: z.record(z.string(), DimBlockSchema),
  summary: z.string()
});

export function registerIpcHandlers(): void {
  ipcMain.handle('ping', () => ({ ok: true, ts: Date.now() }));

  const storage = getStorage();

  ipcMain.handle('settings:get', () => storage.getSettings());
  ipcMain.handle('settings:save', (_e, config) => { storage.saveSettings(config); });
  ipcMain.handle('settings:testLlmConnection', async () => llmTest());

  ipcMain.handle('skill:getAll', () => storage.getAllSkills());
  ipcMain.handle('skill:save', (_e, skill: Skill) => storage.saveSkill(skill));
  ipcMain.handle('skill:delete', (_e, id: string) => { storage.deleteSkill(id); });
  ipcMain.handle('skill:scanDirectory', async (_e, dirPath: string) => {
    const safe = safePath(dirPath);
    const existing = storage.getAllSkills();
    const scanned = await scanSkillDirectory(safe, existing);
    scanned.forEach(s => storage.saveSkill(s));
    return storage.getAllSkills();
  });

  ipcMain.handle('skill:llmEnrich', async (_e, id: string) => {
    const all = storage.getAllSkills();
    const skill = all.find(s => s.id === id);
    if (!skill) throw new Error('Skill 不存在: ' + id);
    const sys = readPrompt('L1-skill-enrich');
    const usr = `Skill 文档:\n\`\`\`\n${skill.raw_markdown ?? skill.name + '\n' + skill.description}\n\`\`\``;
    const res = await callLlm<z.infer<typeof L1Schema>>({
      systemPrompt: sys, userPrompt: usr, schema: L1Schema, jsonMode: true
    });
    skill.tags = res.tags;
    skill.preconditions = res.preconditions;
    skill.side_effects = res.side_effects;
    if (res.estimated_duration) skill.estimated_duration = res.estimated_duration;
    if (res.input_schema) skill.input_schema = res.input_schema as any;
    if (res.output_schema) skill.output_schema = res.output_schema as any;
    if (res.related_skill_hints?.length) {
      skill.related_skill_ids = all
        .filter(s => s.id !== skill.id && res.related_skill_hints.some(h => s.name.includes(h) || s.description.includes(h)))
        .map(s => s.id);
    }
    return storage.saveSkill(skill);
  });

  ipcMain.handle('sop:getAll', () => storage.getAllSOPs());
  ipcMain.handle('sop:get', (_e, id: string) => storage.getSOP(id));
  ipcMain.handle('sop:save', (_e, sop) => storage.saveSOP(sop));
  ipcMain.handle('sop:delete', (_e, id: string) => { storage.deleteSOP(id); });

  ipcMain.handle('sop:generate', async (_e, payload: any) => {
    const { goal, selectedSkillIds, reviewConfig } = payload;
    if (!goal || !selectedSkillIds?.length) throw new Error('请填写目标并选择至少一个 Skill');
    const allSkills = storage.getAllSkills();
    const selected = allSkills.filter(s => selectedSkillIds.includes(s.id));
    if (selected.length === 0) throw new Error('所选 Skill 均无效');

    const dimOrder = reviewConfig?.dimension_order ?? DEFAULT_DIMENSIONS.map(d => d.key);
    const principles = dimOrder.map((k, i) => {
      const d = DEFAULT_DIMENSIONS.find(x => x.key === k)!;
      return `${i + 1}. ${d.icon} ${d.name}：${d.description}`;
    }).join('\n');
    const table = selected.map(s => `【${s.id}】name=${s.name}; description=${s.description}; preconditions=${s.preconditions.join(';') || '(none)'}${s.estimated_duration ? '; 预估耗时=' + s.estimated_duration : ''}`).join('\n');
    const sys = readPrompt('L3-generate-sop').replace('{{PRINCIPLES_LIST}}', principles).replace('{{SKILLS_TABLE}}', table);
    const usr = `【用户目标】\n${goal}`;

    const data = await callLlm({ systemPrompt: sys, userPrompt: usr, schema: SOPSchema, jsonMode: true, temperature: 0.5 });
    const sop: SOP = {
      id: randomUUID(),
      name: data.name,
      goal,
      version: '1.0.0',
      nodes: data.nodes as any,
      edges: data.edges as any,
      success_criteria: data.success_criteria,
      tags: data.tags,
      source: 'generated',
      explanation: (data as any).explanation,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    applyAutoLayout(sop);
    return storage.saveSOP(sop);
  });

  ipcMain.handle('sop:importMarkdown', async (_e, text: string, _cfg: any) => {
    if (!text?.trim()) throw new Error('请提供 Markdown 文本');
    const all = storage.getAllSkills();
    const idx = all.map(s => `- ${s.name} (ID=${s.id})：${s.description}`).join('\n');
    const sys = readPrompt('L2-markdown-to-sop').replace('{{SKILL_INDEX}}', idx);

    const data = await callLlm({ systemPrompt: sys, userPrompt: 'Markdown:\n```\n' + text + '\n```', schema: ImportSOPSchema, jsonMode: true, temperature: 0.3 });

    const sop: SOP = {
      id: randomUUID(),
      name: data.name,
      goal: (data as any).goal ?? data.name,
      version: '1.0.0',
      nodes: data.nodes.map((n: any) => {
        if (n.type === 'skill' && n.skill_hint && !n.skill_id) {
          const hit = all.find(s => s.name.includes(n.skill_hint) || n.skill_hint.includes(s.name) || s.description.includes(n.skill_hint));
          if (hit) n.skill_id = hit.id;
        }
        if (n.type === 'skill' && !n.skill_id) {
          n.description = '[疑似解析误差请确认] ' + (n.description ?? '') + '; Skill 匹配失败原关键字=' + (n.skill_hint ?? '');
          n.type = 'manual';
          n.manual_checklist = ['核对该节点实际应为 Skill 还是人工操作', '确认与前后步骤衔接正确'];
        }
        return n;
      }) as any,
      edges: data.edges as any,
      success_criteria: data.success_criteria,
      tags: data.tags ?? [],
      source: 'imported',
      source_markdown: text,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    applyAutoLayout(sop);
    return storage.saveSOP(sop);
  });

  ipcMain.handle('sop:review', async (_e, sopId: string, cfg: any) => {
    const sop = storage.getSOP(sopId);
    if (!sop) throw new Error('SOP 不存在: ' + sopId);
    const dimOrder: ReviewDimension[] = cfg?.dimension_order ?? DEFAULT_DIMENSIONS.map(d => d.key) as any;
    const skillIds = new Set<string>();
    sop.nodes.forEach(n => { if (n.skill_id) skillIds.add(n.skill_id); });
    const allSkills = storage.getAllSkills();
    const related = allSkills.filter(s => skillIds.has(s.id));

    const rankings = dimOrder.map((k, i) => {
      const d = DEFAULT_DIMENSIONS.find(x => x.key === k)!;
      return `优先级 #${i + 1}：${d.icon} ${d.name}（说明：${d.description}）`;
    }).join('\n');

    const sys = readPrompt('L4-review-sop').replace('{{DIMENSION_RANKINGS}}', rankings);
    const usr = `【SOP JSON】\n\`\`\`json\n${JSON.stringify(sop, null, 2)}\n\`\`\`\n\n【引用 Skill 详情】\n\`\`\`json\n${JSON.stringify(related, null, 2)}\n\`\`\``;

    const raw = await callLlm<any>({ systemPrompt: sys, userPrompt: usr, jsonMode: true, temperature: 0.35 });
    const normalized: any = { overall_score: raw.overall_score ?? 0, dimension_scores: {}, summary: raw.summary ?? '' };
    dimOrder.forEach(k => {
      const block = raw.dimension_scores?.[k];
      if (!block) {
        normalized.dimension_scores[k] = { score: 0, findings: [] };
        return;
      }
      normalized.dimension_scores[k] = {
        score: typeof block.score === 'number' ? block.score : 0,
        findings: (block.findings || []).map((f: any) => ({
          id: f.id || randomUUID(),
          severity: f.severity || 'suggestion',
          dimension: k,
          title: f.title || '(无标题)',
          detail: f.detail || '',
          related_node_ids: f.related_node_ids || [],
          suggestion: f.suggestion,
          suspected_parse_error: !!f.suspected_parse_error
        }))
      };
    });
    return normalized;
  });

  ipcMain.handle('sop:export', async (_e, id, format) => {
    const sop = storage.getSOP(id);
    if (!sop) return { filename: 'not_found', content: '' };
    const content = format === 'json' ? exportToJSON(sop) : exportToMarkdown(sop);
    const ext = format === 'json' ? 'json' : 'md';
    const res = await dialog.showSaveDialog({
      title: '导出 SOP',
      defaultPath: `${sop.name}.${ext}`,
      filters: [{ name: format === 'json' ? 'JSON' : 'Markdown', extensions: [ext] }]
    });
    if (res.canceled || !res.filePath) {
      return { filename: `${sop.name}.${ext}`, content, canceled: true };
    }
    fs.writeFileSync(res.filePath, content, 'utf-8');
    return { filename: path.basename(res.filePath), content, savedTo: res.filePath };
  });

  ipcMain.handle('dialog:pickDirectory', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });
}
