import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  const llmConfig = ref({ apiKey: '', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' });
  const scanDirs = ref<string[]>([]);

  async function load() {
    try {
      const s = await window.api.settings.get();
      llmConfig.value = s.llm;
      scanDirs.value = s.scanDirs;
    } catch { /* ignore */ }
  }
  async function save() {
    await window.api.settings.save({ llm: llmConfig.value, scanDirs: scanDirs.value });
  }

  return { llmConfig, scanDirs, load, save };
});
