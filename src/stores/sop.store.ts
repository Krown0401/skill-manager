import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SOP } from '@/shared/types/sop';

export const useSOPStore = defineStore('sop', () => {
  const sops = ref<{ id: string; name: string; goal: string; source?: any; updated_at: number; created_at: number }[]>([]);
  const currentSOP = ref<SOP | null>(null);

  async function loadAll() {
    sops.value = await window.api.sop.getAll();
  }

  async function get(id: string) {
    currentSOP.value = await window.api.sop.get(id);
    return currentSOP.value;
  }

  async function save(sop: SOP) {
    const saved = await window.api.sop.save(sop);
    const idx = sops.value.findIndex(s => s.id === saved.id);
    const meta = { id: saved.id, name: saved.name, goal: saved.goal, source: saved.source, updated_at: saved.updated_at, created_at: saved.created_at };
    if (idx >= 0) sops.value[idx] = meta;
    else sops.value.push(meta);
    currentSOP.value = saved;
    return saved;
  }

  async function remove(id: string) {
    await window.api.sop.delete(id);
    sops.value = sops.value.filter(s => s.id !== id);
    if (currentSOP.value?.id === id) currentSOP.value = null;
  }

  async function generate(payload: { goal: string; selectedSkillIds: string[]; reviewConfig: any }) {
    const generated = await window.api.sop.generate(payload);
    await save(generated);
    return generated;
  }

  async function importMarkdown(text: string, cfg: any) {
    const imported = await window.api.sop.importMarkdown(text, cfg);
    await save(imported);
    return imported;
  }

  async function exportSOP(id: string, format: 'json' | 'md') {
    return window.api.sop.export(id, format);
  }

  return { sops, currentSOP, loadAll, get, save, remove, generate, importMarkdown, exportSOP };
});
