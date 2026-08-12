<template>
  <div style="max-width: 1280px; margin: 0 auto;">
    <el-card v-if="!currentSOP || !reviewStore.lastReviewResult">
      <template #header><strong>🔍 SOP 审查优化（场景 B）</strong></template>
      <el-tabs v-model="tab" type="border-card">
        <el-tab-pane label="📝 粘贴/上传 Markdown" name="md">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
            粘贴 Markdown 文本或上传 .md 文件。推荐直接粘贴组合型 Skill（如 form-template-sop）的 SKILL.md，包含 Mermaid 流程图效果更佳。
          </el-alert>
          <el-upload
            accept=".md,.markdown"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="onFile"
            style="margin-bottom: 10px;"
          >
            <el-button type="primary" size="small">📁 上传 .md 文件</el-button>
            <span style="margin-left: 10px; color: #6b7280; font-size: 12px;">支持 .md / .markdown 纯文本</span>
          </el-upload>
          <el-input v-model="markdownText" type="textarea" :rows="16" placeholder='## SOP 标题（示例）\n\n- Step 1 ...\n- Step 2 ...\n\n或 Mermaid 代码块...' />
          <div style="margin-top: 14px;">
            <el-button type="success" :disabled="!markdownText.trim() || importing" :loading="importing" @click="onParse">
              → 解析为结构化 SOP 进入审查
            </el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="📚 从 SOP 历史库选择" name="history">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
            从已生成/导入的 SOP 中选择一条直接审查。
          </el-alert>
          <el-table :data="sopStore.sops" v-if="sopStore.sops.length" height="400" border highlight-current-row @current-change="onPickSOP" stripe>
            <el-table-column prop="name" label="名称" min-width="240" />
            <el-table-column prop="goal" label="目标" show-overflow-tooltip />
            <el-table-column label="来源" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="row.source === 'generated' ? 'success' : 'warning'">
                  {{ row.source === 'generated' ? '生成' : '导入' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="primary" link @click="onPickSOP(row)">→ 审查此条</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="历史库为空。先去「SOP 智能生成」创建一条，或「粘贴 Markdown 解析」导入。">
            <el-button type="primary" @click="$router.push('/sop-generator')">去生成一条 →</el-button>
          </el-empty>
        </el-tab-pane>
      </el-tabs>

      <el-divider content-position="left" v-if="currentSOP">🧭 审查维度排序</el-divider>
      <ReviewConfigPanel v-if="currentSOP" v-model="reviewStore.currentReviewConfig.dimension_order" />
      <div v-if="currentSOP" style="margin-top: 14px; text-align: right;">
        <el-button @click="currentSOP = null">取消</el-button>
        <el-button type="primary" :loading="reviewStore.reviewing" @click="onRun">
          🚀 开始审查「{{ currentSOP.name }}」
        </el-button>
      </div>
    </el-card>

    <ReviewResultView
      v-else
      :sop="currentSOP"
      :result="reviewStore.lastReviewResult"
      :dimension-order="reviewStore.currentReviewConfig.dimension_order"
    />
    <div v-if="currentSOP && reviewStore.lastReviewResult" style="margin-top: 16px; text-align: right;">
      <el-button @click="onReset">🔄 重新选择 / 重新审查</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useSOPStore } from '@/stores/sop.store';
import { useSkillStore } from '@/stores/skill.store';
import { useReviewStore } from '@/stores/review.store';
import type { SOP } from '@/shared/types/sop';
import ReviewConfigPanel from './ReviewConfigPanel.vue';
import ReviewResultView from './ReviewResultView.vue';

const sopStore = useSOPStore();
const skillStore = useSkillStore();
const reviewStore = useReviewStore();

const tab = ref<'md' | 'history'>('md');
const markdownText = ref('');
const importing = ref(false);
const currentSOP = ref<SOP | null>(null);

async function onFile(f: any) {
  const raw = f?.raw || f;
  if (!raw) return;
  try {
    const text = await raw.text();
    markdownText.value = text;
    ElMessage.success(`已读取文件：${raw.name}（${text.length} 字符）`);
  } catch (e: any) {
    ElMessage.error('读取文件失败：' + e.message);
  }
}

async function onParse() {
  if (!markdownText.value.trim()) return;
  importing.value = true;
  try {
    const imported = await sopStore.importMarkdown(markdownText.value.trim(), reviewStore.currentReviewConfig);
    currentSOP.value = imported;
    ElMessage.success('解析完成，SOP 已入库：' + imported.name);
  } catch (e: any) {
    ElMessage.error('解析失败：' + e.message);
  } finally {
    importing.value = false;
  }
}

function onPickSOP(row: any) {
  if (!row?.id) return;
  sopStore.get(row.id).then(s => {
    if (s) currentSOP.value = s;
  });
}

async function onRun() {
  if (!currentSOP.value) return;
  try {
    await reviewStore.review(currentSOP.value.id);
    ElMessage.success('审查完成');
  } catch (e: any) {
    ElMessage.error('审查失败：' + e.message);
  }
}

function onReset() {
  currentSOP.value = null;
  reviewStore.lastReviewResult = null;
}

onMounted(async () => {
  await Promise.all([skillStore.load(), sopStore.loadAll()]);
});
</script>
