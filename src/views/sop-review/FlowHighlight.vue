<template>
  <div style="width: 100%; height: 500px; border: 1px solid #ebeef5; border-radius: 6px; overflow: hidden; background: #fafafa;">
    <X6Canvas v-if="sop" :nodes="sop.nodes" :edges="sop.edges" :highlight-nodes="highlightMap" readonly @node-click="onClick" />
    <el-empty v-else description="暂无 SOP 数据" />
  </div>
  <div style="margin-top: 8px; display: flex; gap: 16px; font-size: 12px; color: #6b7280;">
    <span><span style="display:inline-block; width:12px; height:12px; border: 2.5px solid #ef4444; background:#fff; border-radius:2px; vertical-align: middle;"></span> Critical 阻塞</span>
    <span><span style="display:inline-block; width:12px; height:12px; border: 2.5px solid #f59e0b; background:#fff; border-radius:2px; vertical-align: middle;"></span> Warning 建议修复</span>
    <span><span style="display:inline-block; width:12px; height:12px; border: 2.5px solid #0ea5e9; background:#fff; border-radius:2px; vertical-align: middle;"></span> Suggestion 可选优化</span>
    <span style="opacity: 0.6;">未命中节点透明度降低以聚焦问题</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import X6Canvas from '@/components/flow/X6Canvas.vue';
import type { SOP, SOPNode } from '@/shared/types/sop';
import type { ReviewResult, FindingSeverity } from '@/shared/types/review';

const props = defineProps<{
  sop: SOP | null;
  result: ReviewResult | null;
}>();

const emit = defineEmits<{ 'node-click': [SOPNode] }>();

const highlightMap = computed(() => {
  const m = new Map<string, FindingSeverity>();
  if (!props.result) return m;
  const sevRank = { critical: 3, warning: 2, suggestion: 1 } as Record<FindingSeverity, number>;
  Object.values(props.result.dimension_scores).forEach(block => {
    (block?.findings || []).forEach(f => {
      (f.related_node_ids || []).forEach(nid => {
        const prev = m.get(nid);
        if (!prev || sevRank[f.severity] > sevRank[prev]) m.set(nid, f.severity);
      });
    });
  });
  return m;
});

function onClick(n: SOPNode) { emit('node-click', n); }
</script>
