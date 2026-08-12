import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import type { Skill } from '../../src/shared/types/skill';
import { randomUUID } from 'node:crypto';

const SkillFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1)
}).passthrough();

/**
 * 递归扫描 dirPath，找每个子目录下的 SKILL.md，解析 frontmatter。
 * 返回 Skill[]（source_type=scan，不直接入库，由调用方决定 upsert 还是返回）
 */
export async function scanSkillDirectory(dirPath: string, existingSkills: Skill[]): Promise<Skill[]> {
  const results: Skill[] = [];
  const existingMap = new Map(existingSkills.filter(s => s.source_path).map(s => [s.source_path!, s]));

  function walk(cur: string) {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); }
    catch { return; }

    const mdFile = entries.find(e => e.isFile() && e.name === 'SKILL.md');
    if (mdFile) {
      const mdPath = path.join(cur, 'SKILL.md');
      try {
        const text = fs.readFileSync(mdPath, 'utf-8');
        const parsed = matter(text);
        const validate = SkillFrontmatterSchema.safeParse(parsed.data);
        if (!validate.success) return;

        const absDir = fs.realpathSync ? fs.realpathSync(cur) : path.resolve(cur);
        const prev = existingMap.get(absDir);
        results.push({
          id: prev?.id ?? randomUUID(),
          name: validate.data.name,
          description: validate.data.description,
          source_type: 'scan',
          source_path: absDir,
          tags: prev?.tags ?? [],
          preconditions: prev?.preconditions ?? [],
          side_effects: prev?.side_effects ?? [],
          related_skill_ids: prev?.related_skill_ids ?? [],
          estimated_duration: prev?.estimated_duration,
          input_schema: prev?.input_schema,
          output_schema: prev?.output_schema,
          raw_markdown: text,
          created_at: prev?.created_at ?? Date.now(),
          updated_at: Date.now()
        });
      } catch { /* skip malformed files */ }
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(path.join(cur, entry.name));
      }
    }
  }

  walk(dirPath);
  return results;
}
