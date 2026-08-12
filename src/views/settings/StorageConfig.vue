<template>
  <el-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>💾 存储与扫描目录配置</span>
        <el-button type="primary" @click="onAdd">➕ 添加扫描目录</el-button>
      </div>
    </template>

    <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
      目录下每个子文件夹若包含 <code>SKILL.md</code> 会被识别为一个 Skill，并解析其 frontmatter 的 name / description。
    </el-alert>

    <el-table :data="settings.scanDirs" v-if="settings.scanDirs.length" stripe>
      <el-table-column type="index" label="#" width="50" />
      <el-table-column prop="$this" label="目录路径">
        <template #default="{ row }"><code>{{ row }}</code></template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="onScanOne(row)">立即扫描</el-button>
          <el-popconfirm title="确认移除该目录？（不会删除任何磁盘文件）" @confirm="onRemove(row)">
            <template #reference><el-button link type="danger">移除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-else description="暂无扫描目录。点击右上角「添加扫描目录」选择 Skill 根目录。" />

    <el-divider />
    <div style="text-align: right;">
      <el-button :disabled="!settings.scanDirs.length" type="warning" @click="onScanAll" :loading="scanning">🔄 全部重新扫描</el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useSettingsStore } from '@/stores/settings.store';
import { useSkillStore } from '@/stores/skill.store';

const store = useSettingsStore();
const skillStore = useSkillStore();
const settings = reactive({
  llm: { apiKey: '', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  scanDirs: [] as string[]
});
const scanning = ref(false);

onMounted(async () => {
  await store.load();
  settings.llm = { ...store.llmConfig };
  settings.scanDirs = [...store.scanDirs];
});

async function persist() {
  store.scanDirs = [...settings.scanDirs];
  store.llmConfig = { ...settings.llm };
  await store.save();
}

async function onAdd() {
  const dir = await window.api.dialog.pickDirectory();
  if (!dir) return;
  if (settings.scanDirs.includes(dir)) return ElMessage.warning('此目录已存在');
  settings.scanDirs.push(dir);
  await persist();
  ElMessage.success('已添加，正在首次扫描...');
  await scanOne(dir);
}

async function onRemove(dir: string) {
  settings.scanDirs = settings.scanDirs.filter(d => d !== dir);
  await persist();
  ElMessage.success('已移除');
}

async function scanOne(dir: string) {
  try { await skillStore.scanDirectory(dir); ElMessage.success(`扫描完成：${dir}`); }
  catch (e: any) { ElMessage.error('扫描失败：' + e.message); }
}

async function onScanOne(row: string) { await scanOne(row); }

async function onScanAll() {
  scanning.value = true;
  try {
    for (const d of [...settings.scanDirs]) await skillStore.scanDirectory(d);
    ElMessage.success('全部扫描完成');
  } finally { scanning.value = false; }
}
</script>
