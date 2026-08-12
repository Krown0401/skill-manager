import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Skill } from '@/shared/types/skill';

export const useSkillStore = defineStore('skill', () => {
  const skills = ref<Skill[]>([]);

  const skillMap = computed(() => {
    const m = new Map<string, Skill>();
    skills.value.forEach(s => m.set(s.id, s));
    return m;
  });

  async function load() {
    try { skills.value = await window.api.skill.getAll(); }
    catch { skills.value = []; }
  }

  async function scanDirectory(dirPath: string) {
    skills.value = await window.api.skill.scanDirectory(dirPath);
  }

  async function save(skill: Skill) {
    const saved = await window.api.skill.save(skill);
    const idx = skills.value.findIndex(s => s.id === saved.id);
    if (idx >= 0) skills.value[idx] = saved;
    else skills.value.push(saved);
    return saved;
  }

  async function remove(id: string) {
    await window.api.skill.delete(id);
    skills.value = skills.value.filter(s => s.id !== id);
  }

  return { skills, skillMap, load, scanDirectory, save, remove };
});
