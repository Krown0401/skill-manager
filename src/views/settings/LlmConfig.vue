<template>
  <el-card>
    <template #header>🔑 LLM 配置</template>
    <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
      每位用户请填写自己的私有 API Key，数据仅保存在本机 <code>userData/skill-manager</code> 目录下（electron-store），不会上传到任何服务器。
    </el-alert>
    <el-form label-width="120px" style="max-width: 720px;">
      <el-form-item label="API Key" required>
        <el-input v-model="form.apiKey" type="password" show-password placeholder="sk-..." />
      </el-form-item>
      <el-form-item label="Base URL" required>
        <el-input v-model="form.baseURL" placeholder="https://api.openai.com/v1（兼容 OpenAI 协议的其他地址可自行替换）" />
      </el-form-item>
      <el-form-item label="Model" required>
        <el-input v-model="form.model" placeholder="如 gpt-4o-mini / gpt-4o / deepseek-chat 等" />
      </el-form-item>
      <el-form-item>
        <el-space>
          <el-button type="primary" @click="onSave">保存</el-button>
          <el-button @click="onTest" :loading="testing">测试连通性</el-button>
        </el-space>
      </el-form-item>
    </el-form>
    <el-divider />
    <div v-if="lastResult" style="padding: 12px; border-radius: 6px;" :style="{ background: lastResult.ok ? '#ecfdf5' : '#fef2f2', color: lastResult.ok ? '#065f46' : '#991b1b' }">
      <strong>{{ lastResult.ok ? '✅ 连通成功' : '❌ 连通失败' }}</strong>：{{ lastResult.message }}
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useSettingsStore } from '@/stores/settings.store';

const store = useSettingsStore();
const form = reactive({ apiKey: '', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' });
const testing = ref(false);
const lastResult = ref<{ ok: boolean; message: string } | null>(null);

onMounted(async () => {
  await store.load();
  form.apiKey = store.llmConfig.apiKey;
  form.baseURL = store.llmConfig.baseURL;
  form.model = store.llmConfig.model;
});

async function onSave() {
  store.llmConfig.apiKey = form.apiKey;
  store.llmConfig.baseURL = form.baseURL;
  store.llmConfig.model = form.model;
  await store.save();
  ElMessage.success('已保存到本地存储');
}

async function onTest() {
  if (!form.apiKey.trim()) return ElMessage.warning('请先填写 API Key');
  await onSave();
  testing.value = true;
  try {
    lastResult.value = await window.api.settings.testLlmConnection();
  } catch (e: any) {
    lastResult.value = { ok: false, message: e.message || String(e) };
  } finally {
    testing.value = false;
  }
}
</script>
