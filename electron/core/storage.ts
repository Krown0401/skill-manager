import Store from 'electron-store';
import path from 'path';
import { app } from 'electron';

type Skill = any;
type SOP = any;

interface Settings {
  llm: { apiKey: string; baseURL: string; model: string };
  scanDirs: string[];
}

let storageInstance: ReturnType<typeof createStorage> | null = null;

function createStorage() {
  const store = new Store({
    name: 'skill-manager-data',
    cwd: path.join(app.getPath('userData'), 'skill-manager'),
    defaults: {
      settings: {
        llm: { apiKey: '', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
        scanDirs: []
      },
      skills: {} as Record<string, Skill>,
      sops: {} as Record<string, SOP>
    }
  });

  return {
    getSettings(): Settings {
      return store.get('settings') as Settings;
    },
    saveSettings(cfg: Settings) {
      store.set('settings', cfg);
    },
    getAllSkills(): Skill[] {
      const map = store.get('skills') as Record<string, Skill>;
      return Object.values(map || {});
    },
    getSkill(id: string): Skill | undefined {
      const map = store.get('skills') as Record<string, Skill>;
      return map?.[id];
    },
    saveSkill(skill: Skill): Skill {
      const map = store.get('skills') as Record<string, Skill> || {};
      const now = Date.now();
      const finalSkill: Skill = { ...skill, updated_at: now, created_at: skill.created_at || now };
      map[finalSkill.id] = finalSkill;
      store.set('skills', map);
      return finalSkill;
    },
    deleteSkill(id: string) {
      const map = store.get('skills') as Record<string, Skill> || {};
      delete map[id];
      store.set('skills', map);
    },
    getAllSOPs(): SOP[] {
      const map = store.get('sops') as Record<string, SOP>;
      return Object.values(map || {}).map(s => ({
        id: s.id, name: s.name, goal: s.goal, source: s.source, updated_at: s.updated_at, created_at: s.created_at
      }));
    },
    getSOP(id: string): SOP | null {
      const map = store.get('sops') as Record<string, SOP>;
      return map?.[id] || null;
    },
    saveSOP(sop: SOP): SOP {
      const map = store.get('sops') as Record<string, SOP> || {};
      const now = Date.now();
      const finalSOP: SOP = { ...sop, updated_at: now, created_at: sop.created_at || now };
      map[finalSOP.id] = finalSOP;
      store.set('sops', map);
      return finalSOP;
    },
    deleteSOP(id: string) {
      const map = store.get('sops') as Record<string, SOP> || {};
      delete map[id];
      store.set('sops', map);
    }
  };
}

export function getStorage() {
  if (!storageInstance) storageInstance = createStorage();
  return storageInstance;
}
