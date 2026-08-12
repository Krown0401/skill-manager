<template>
  <el-card>
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>🛠 Skill 库管理（共 {{ store.skills.length }} 条）</span>
        <el-space>
          <el-input v-model="keyword" placeholder="搜索名称/描述/标签" clearable style="width: 260px;" :prefix-icon="Search" />
          <el-button type="primary" @click="onScan">📂 扫描目录</el-button>
          <el-button @click="onCreate">➕ 手动新建</el-button>
        </el-space>
      </div>
    </template>

    <el-table :data="filtered" style="width: 100%;" v-loading="loading" stripe>
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
      <el-table-column label="标签" min-width="180">
        <template #default="{ row }">
          <el-tag v-for="t in (row.tags || []).slice(0, 3)" :key="t" size="small" style="margin-right: 4px;">{{ t }}</el-tag>
          <span v-if="(row.tags || []).length > 3" style="color: #909399; font-size: 12px;">+{{ row.tags.length - 3 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="来源" width="100">
        <template #default="{ row }">
          <el-tag :type="row.source_type === 'scan' ? 'info' : 'success'" size="small">{{ row.source_type === 'scan' ? '扫描' : '手动' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="160">
        <template #default="{ row }">{{ formatDate(row.updated_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="onEdit(row)">编辑</el-button>
          <el-button link type="warning" :loading="enrichingId === row.id" @click="onEnrich(row)">AI 补全</el-button>
          <el-popconfirm title="确认删除此 Skill？" @confirm="onDelete(row.id)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无 Skill。点击「扫描目录」导入 .agents/skills 目录，或「手动新建」。" />
      </template>
    </el-table>

    <SkillEditorDrawer v-model="showDrawer" :initial="editing" @saved="onSaved" />
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useSkillStore } from '@/stores/skill.store';
import type { Skill } from '@/shared/types/skill';
import SkillEditorDrawer from './SkillEditorDrawer.vue';

const store = useSkillStore();
const loading = ref(false);
const keyword = ref('');
const showDrawer = ref(false);
const editing = ref<Skill | null>(null);
const enrichingId = ref<string | null>(null);

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return store.skills;
  return store.skills.filter(s =>
    s.name.toLowerCase().includes(kw) ||
    s.description.toLowerCase().includes(kw) ||
    (s.tags || []).some(t => t.toLowerCase().includes(kw))
  );
});

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function onScan() {
  const dir = await window.api.dialog.pickDirectory();
  if (!dir) return;
  loading.value = true;
  try {
    await store.scanDirectory(dir);
    ElMessage.success(`扫描完成，当前 Skill 库共 ${store.skills.length} 条`);
  } catch (e: any) {
    ElMessage.error('扫描失败：' + e.message);
  } finally {
    loading.value = false;
  }
}

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function onCreate() {
  const now = Date.now();
  editing.value = {
    id: uuid(),
    name: '',
    description: '',
    source_type: 'manual',
    tags: [],
    preconditions: [],
    side_effects: [],
    related_skill_ids: [],
    created_at: now,
    updated_at: now
  };
  showDrawer.value = true;
}

function onEdit(row: Skill) {
  editing.value = { ...row };
  showDrawer.value = true;
}

async function onEnrich(row: Skill) {
  enrichingId.value = row.id;
  try {
    const enriched = await window.api.skill.llmEnrich(row.id);
    const idx = store.skills.findIndex(s => s.id === enriched.id);
    if (idx >= 0) store.skills[idx] = enriched;
    ElMessage.success('AI 补全完成，字段已更新');
  } catch (e: any) {
    ElMessage.error('AI 补全失败：' + e.message);
  } finally {
    enrichingId.value = null;
  }
}

async function onSaved(skill: Skill) {
  await store.save(skill);
  ElMessage.success('已保存');
  showDrawer.value = false;
}

async function onDelete(id: string) {
  await store.remove(id);
  ElMessage.success('已删除');
}

onMounted(async () => {
  loading.value = true;
  try { await store.load(); } finally { loading.value = false; }
});
</script>
