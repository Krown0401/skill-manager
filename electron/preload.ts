import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping'),

  skill: {
    scanDirectory: (dirPath: string) => ipcRenderer.invoke('skill:scanDirectory', dirPath),
    getAll: () => ipcRenderer.invoke('skill:getAll'),
    save: (skill: any) => ipcRenderer.invoke('skill:save', skill),
    delete: (id: string) => ipcRenderer.invoke('skill:delete', id),
    llmEnrich: (id: string) => ipcRenderer.invoke('skill:llmEnrich', id)
  },

  sop: {
    getAll: () => ipcRenderer.invoke('sop:getAll'),
    get: (id: string) => ipcRenderer.invoke('sop:get', id),
    save: (sop: any) => ipcRenderer.invoke('sop:save', sop),
    delete: (id: string) => ipcRenderer.invoke('sop:delete', id),
    generate: (payload: any) => ipcRenderer.invoke('sop:generate', payload),
    importMarkdown: (text: string, cfg: any) => ipcRenderer.invoke('sop:importMarkdown', text, cfg),
    review: (sopId: string, cfg: any) => ipcRenderer.invoke('sop:review', sopId, cfg),
    export: (id: string, format: 'json' | 'md') => ipcRenderer.invoke('sop:export', id, format)
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (config: any) => ipcRenderer.invoke('settings:save', config),
    testLlmConnection: () => ipcRenderer.invoke('settings:testLlmConnection')
  },

  dialog: {
    pickDirectory: () => ipcRenderer.invoke('dialog:pickDirectory')
  }
});

ipcRenderer.invoke('ping');
