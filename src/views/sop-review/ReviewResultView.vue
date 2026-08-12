<template>
  <div v-if="sop && result" style="min-height: 500px;">
    <el-card style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 24px;">
        <div style="text-align: center; min-width: 180px;">
          <div style="font-size: 72px; font-weight: 800; line-height: 1;" :style="{ color: level.color }">
            {{ result.overall_score }}
          </div>
          <div style="font-weight: 600; margin-top: 4px;" :style="{ color: level.color }">{{ level.label }}</div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">SOP 审查总览：{{ sop.name }}</div>
          <el-progress :percentage="result.overall_score" :color="level.color" :stroke-width="14" :show-text="false" />
          <div style="margin-top: 12px; color: #374151;">{{ result.summary }}</div>
        </div>
      </div>
    </el-card>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card style="margin-bottom: 16px;">
          <template #header><strong>📊 雷达图（8 维度分布）</strong></template>
          <RadarScoreChart :scores="dimScores" :order="order" />
        </el-card>
        <el-card>
          <template #header><strong>📏 维度得分条（透明化权重贡献计算）</strong></template>
          <DimensionScoreBar :scores="dimScores" :weights="weights" :order="order" :height="340" />
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card style="margin-bottom: 16px;">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>🚨 分级优化建议</strong>
              <el-tag size="small">共 {{ totalFindings }} 条</el-tag>
            </div>
          </template>
          <el-tabs v-model="activeTab" type="card">
            <el-tab-pane label="🔴 Critical 阻塞" name="critical">
              <FindingsList :items="findingsBySeverity.critical" @focus-node="onFocusNode" />
            </el-tab-pane>
            <el-tab-pane label="🟡 Warning 建议修复" name="warning">
              <FindingsList :items="findingsBySeverity.warning" @focus-node="onFocusNode" />
            </el-tab-pane>
            <el-tab-pane label="🔵 Suggestion 可选优化" name="suggestion">
              <FindingsList :items="findingsBySeverity.suggestion" @focus-node="onFocusNode" />
            </el-tab-pane>
          </el-tabs>
        </el-card>
        <el-card>
          <template #header>
            <strong>🔍 流程图高亮 · 点击问题节点查看关联 findings（当前选中：{{ focusedNodeId || '无' }}）</strong>
          </template>
          <FlowHighlight :sop="sop" :result="result" @node-click="onFlowNodeClick" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SOP } from '@/shared/types/sop';
import type { ReviewResult, ReviewDimension, ReviewFinding, FindingSeverity, ReviewDimensionMeta } from '@/shared/types/review';
import { scoreLevel, calculateWeights } from '@/shared/utils/score';
import { DEFAULT_DIMENSIONS } from '@/shared/constants/dimensions';
import RadarScoreChart from '@/components/chart/RadarScoreChart.vue';
import DimensionScoreBar from '@/components/chart/DimensionScoreBar.vue';
import FlowHighlight from './FlowHighlight.vue';
import FindingsList from './FindingsList.vue';

const props = defineProps<{
  sop: SOP | null;
  result: ReviewResult | null;
  dimensionOrder: ReviewDimension[];
}>();

const emit = defineEmits<{ 'focusNode': [string | null] }>();

const activeTab = ref<FindingSeverity>('critical');
const focusedNodeId = ref<string | null>(null);

const order = computed(() => props.dimensionOrder);
const weights = computed(() => calculateWeights(order.value));
const level = computed(() => scoreLevel(props.result?.overall_score ?? 0));

const dimScores = computed(() => {
  const out = {} as Record<ReviewDimension, number>;
  (Object.keys(props.result?.dimension_scores || {}) as ReviewDimension[]).forEach(k => {
    out[k] = props.result!.dimension_scores[k]?.score ?? 0;
  });
  order.value.forEach(k => { if (!(k in out)) out[k] = 0; });
  return out;
});

const allFindings = computed<ReviewFinding[]>(() => {
  const list: ReviewFinding[] = [];
  Object.values(props.result?.dimension_scores || {}).forEach(block => {
    (block?.findings || []).forEach(f => list.push(f));
  });
  return list;
});

const totalFindings = computed(() => allFindings.value.length);

const findingsBySeverity = computed(() => {
  const out = { critical: [] as ReviewFinding[], warning: [] as ReviewFinding[], suggestion: [] as ReviewFinding[] };
  allFindings.value.forEach(f => { out[f.severity].push(f); });
  return out;
});

watch(findingsBySeverity, v => {
  if (v.critical.length) activeTab.value = 'critical';
  else if (v.warning.length) activeTab.value = 'warning';
  else activeTab.value = 'suggestion';
}, { immediate: true });

function dimMeta(k: ReviewDimension): ReviewDimensionMeta | undefined {
  return DEFAULT_DIMENSIONS.find(d => d.key === k);
}

function onFocusNode(id: string | null) {
  focusedNodeId.value = id;
  emit('focusNode', id);
}

function onFlowNodeClick(n: any) {
  focusedNodeId.value = n.id;
  emit('focusNode', n.id);
}
</script>
