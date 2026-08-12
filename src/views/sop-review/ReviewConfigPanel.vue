<template>
  <div>
    <el-divider content-position="left">
      <strong>🧭 审查维度排序（权重：衰减因子 {{ DECAY }}）</strong>
    </el-divider>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <el-alert type="info" :closable="false" show-icon>
        拖拽调整优先级：排在越前面权重越高。默认首位约 20%，末位约 4%。
      </el-alert>
      <el-button link type="primary" @click="onReset">恢复默认排序</el-button>
    </div>
    <div style="border: 1px solid #ebeef5; border-radius: 6px; padding: 12px; background: #fff;">
      <VueDraggable v-model="localOrder" :animation="160" handle=".drag-handle" ghost-class="drag-ghost">
        <div v-for="(key, idx) in localOrder" :key="key" class="dim-row">
          <span class="drag-handle" style="cursor: grab; color: #9ca3af;">⠿</span>
          <el-tag type="primary" effect="dark" size="small" style="width: 28px; text-align: center;">{{ idx + 1 }}</el-tag>
          <div style="flex: 0 0 48px; font-size: 22px; text-align: center;">{{ meta(key)?.icon }}</div>
          <div style="flex: 1;">
            <div style="font-weight: 600;">{{ meta(key)?.name }}</div>
            <div style="color: #6b7280; font-size: 12px;">{{ meta(key)?.description }}</div>
          </div>
          <el-tag type="info" effect="plain" size="default">权重 {{ weights[key]?.toFixed(1) }}%</el-tag>
        </div>
      </VueDraggable>
    </div>
    <div style="margin-top: 10px; color: #6b7280; font-size: 12px;">
      权重总和：{{ Object.values(weights).reduce((a: any, b: any) => a + b, 0).toFixed(1) }}%
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { DEFAULT_DIMENSIONS, DEFAULT_DIMENSION_ORDER } from '@/shared/constants/dimensions';
import { calculateWeights } from '@/shared/utils/score';
import type { ReviewDimension, ReviewDimensionMeta } from '@/shared/types/review';

const DECAY = 0.8;

const props = defineProps<{ modelValue: ReviewDimension[] }>();
const emit = defineEmits<{ 'update:modelValue': [ReviewDimension[]] }>();

const localOrder = ref<ReviewDimension[]>([...(props.modelValue || DEFAULT_DIMENSION_ORDER)]);

watch(() => props.modelValue, v => { localOrder.value = [...(v || DEFAULT_DIMENSION_ORDER)]; }, { immediate: true });
watch(localOrder, v => { emit('update:modelValue', v); }, { deep: true });

function meta(k: ReviewDimension): ReviewDimensionMeta | undefined {
  return DEFAULT_DIMENSIONS.find(d => d.key === k);
}

const weights = computed(() => calculateWeights(localOrder.value));

function onReset() {
  localOrder.value = [...DEFAULT_DIMENSION_ORDER];
}
</script>

<style scoped>
.dim-row {
  display: flex; align-items: center; gap: 12px; padding: 10px 14px; margin-bottom: 8px;
  background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; transition: box-shadow 0.15s ease;
}
.dim-row:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-color: #c7d2fe; }
.drag-ghost { opacity: 0.4; background: #eef2ff !important; border-color: #6366f1 !important; }
</style>
