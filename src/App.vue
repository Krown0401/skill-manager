<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { useSettingsStore } from '@/stores/settings.store';

const router = useRouter();
const settingsStore = useSettingsStore();

async function checkFirstLaunch() {
  try {
    await settingsStore.load();
  } catch {
    /* ignore: electron contextBridge 尚未 ready 等情况 */
  }
  const apiKey = settingsStore.llmConfig?.apiKey ?? '';
  if (!apiKey.trim()) {
    try {
      await ElMessageBox.confirm(
        '首次使用请先配置 LLM API Key，否则智能生成、审查、字段补全等能力不可用。\n是否立即前往设置页？',
        '欢迎使用 Skill-SOP 编排工具',
        { confirmButtonText: '去配置', cancelButtonText: '稍后再说', type: 'info', closeOnClickModal: false }
      );
      router.push('/settings/llm');
    } catch { /* 用户选择稍后再说 */ }
  }
}

onMounted(checkFirstLaunch);
</script>

<style>
html, body, #app { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
</style>
