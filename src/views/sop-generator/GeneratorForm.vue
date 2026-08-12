<template>
  <div style="max-width: 1024px; margin: 0 auto;">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong>✨ SOP 智能生成（场景 A）</strong>
          <el-steps :active="step - 1" finish-status="success" simple style="width: 50%;">
            <el-step title="描述目标" />
            <el-step title="选择 Skill" />
            <el-step title="维度优先级" />
          </el-steps>
        </div>
      </template>

      <div v-if="step === 1">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          用自然语言描述你希望 SOP 完成的业务目标，越具体越好（如"配置一张医院报销单，包含 Jira 信息抓取、UI 分析、生成 Spec 四步流程"）。
        </el-alert>
        <el-form label-width="100px">
          <el-form-item label="目标描述" required>
            <el-input v-model="goal" type="textarea" :rows="5" placeholder="请详细描述..." />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="step = 2">下一步：选择 Skill →</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="step === 2">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          选择参与编排的 Skill。已选 {{ selectedSkillIds.length }} 个，共 {{ skillStore.skills.length }} 个可用。
          <el-button v-if="!skillStore.skills.length" link type="primary" @click="$router.push('/skills')">先去 Skill 库添加</el-button>
        </el-alert>
        <el-table
          ref="tableRef"
          :data="skillStore.skills"
          row-key="id"
          @selection-change="onSel"
          height="400"
          border
        >
          <el-table-column type="selection" width="48" reserve-selection />
          <el-table-column prop="name" label="名称" width="220" />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column label="标签" width="200">
            <template #default="{ row }">
              <el-tag v-for="t in (row.tags || []).slice(0, 3)" :key="t" size="small" style="margin-right: 4px;">{{ t }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="来源" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.source_type === 'scan' ? 'info' : 'success'">
                {{ row.source_type === 'scan' ? '扫' : '手' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top: 12px; display: flex; justify-content: space-between;">
          <el-button @click="step = 1">← 返回</el-button>
          <el-button type="primary" :disabled="selectedSkillIds.length === 0" @click="step = 3">下一步：维度优先级 →</el-button>
        </div>
      </div>

      <div v-if="step === 3">
        <ReviewConfigPanel v-model="dimensionOrder" />
        <div style="margin-top: 20px; display: flex; justify-content: space-between;">
          <el-button @click="step = 2">← 返回</el-button>
          <el-button type="primary" :loading="generating" @click="onGenerate">🚀 开始生成 SOP</el-button>
        </div>
      </div>
    </el-card>

    <el-drawer v-model="resultVisible" title="🎉 生成结果" size="720px" destroy-on-close>
      <div v-if="lastResult">
        <el-descriptions :column="1" border title="SOP 概览">
          <el-descriptions-item label="名称">{{ lastResult.name }}</el-descriptions-item>
          <el-descriptions-item label="目标">{{ lastResult.goal }}</el-descriptions-item>
          <el-descriptions-item label="节点数">{{ lastResult.nodes.length }}</el-descriptions-item>
          <el-descriptions-item label="边数">{{ lastResult.edges.length }}</el-descriptions-item>
          <el-descriptions-item label="标签">
            <el-tag v-for="t in lastResult.tags" :key="t" style="margin-right: 4px;">{{ t }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
        <el-divider>编排说明</el-divider>
        <el-alert type="info" :closable="false" show-icon>{{ lastResult.explanation || '(无说明)' }}</el-alert>
        <el-divider>成功标准</el-divider>
        <ol>
          <li v-for="(c, i) in lastResult.success_criteria" :key="i" style="margin-bottom: 4px;">{{ c }}</li>
        </ol>
        <div style="margin-top: 20px; text-align: right;">
          <el-space>
            <el-button @click="resultVisible = false">关闭</el-button>
            <el-button @click="onReset">重新生成</el-button>
            <el-button type="primary" @click="goDetail">查看完整详情 →</el-button>
          </el-space>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useSkillStore } from '@/stores/skill.store';
import { useSOPStore } from '@/stores/sop.store';
import { DEFAULT_DIMENSION_ORDER } from '@/shared/constants/dimensions';
import type { SOP } from '@/shared/types/sop';
import type { ReviewDimension } from '@/shared/types/review';
import ReviewConfigPanel from '@/views/sop-review/ReviewConfigPanel.vue';

const router = useRouter();
const skillStore = useSkillStore();
const sopStore = useSOPStore();

const step = ref(1);
const goal = ref('');
const selectedSkillIds = ref<string[]>([]);
const dimensionOrder = ref<ReviewDimension[]>([...DEFAULT_DIMENSION_ORDER]);
const generating = ref(false);
const resultVisible = ref(false);
const lastResult = ref<SOP | null>(null);
const tableRef = ref<any>(null);

function onSel(rows: any[]) {
  selectedSkillIds.value = rows.map(r => r.id);
}

async function onGenerate() {
  if (!goal.value.trim()) return ElMessage.warning('请填写目标描述');
  if (!selectedSkillIds.value.length) return ElMessage.warning('请至少选择 1 个 Skill');
  generating.value = true;
  try {
    const result = await sopStore.generate({
      goal: goal.value.trim(),
      selectedSkillIds: selectedSkillIds.value,
      reviewConfig: { dimension_order: dimensionOrder.value }
    });
    lastResult.value = result;
    resultVisible.value = true;
  } catch (e: any) {
    ElMessage.error('生成失败：' + e.message);
  } finally {
    generating.value = false;
  }
}

function onReset() {
  step.value = 1;
  resultVisible.value = false;
}

function goDetail() {
  if (!lastResult.value) return;
  router.push(`/sops/${lastResult.value.id}`);
}

onMounted(async () => {
  await skillStore.load();
});
</script>
