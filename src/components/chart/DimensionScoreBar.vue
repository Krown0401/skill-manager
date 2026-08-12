<template>
  <div>
    <div ref="chartRef" :style="{ width: '100%', height: height + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { Chart } from '@antv/g2';
import type { ReviewDimension } from '@/shared/types/review';
import { DEFAULT_DIMENSIONS } from '@/shared/constants/dimensions';

const props = withDefaults(defineProps<{
  scores: Record<ReviewDimension, number>;
  weights: Record<ReviewDimension, number>;
  order: ReviewDimension[];
  height?: number;
}>(), { height: 320 });

const chartRef = ref<HTMLDivElement>();
let chart: Chart | null = null;

function colorFor(s: number) {
  if (s < 60) return '#ef4444';
  if (s < 75) return '#f59e0b';
  if (s < 90) return '#10b981';
  return '#0ea5e9';
}

function render() {
  if (!chartRef.value) return;
  if (chart) { chart.destroy(); chart = null; }
  const data = [...props.order].reverse().map((k) => {
    const meta = DEFAULT_DIMENSIONS.find(d => d.key === k)!;
    const score = props.scores[k] ?? 0;
    const w = props.weights[k] ?? 0;
    const contrib = Math.round(score * w) / 100;
    return {
      dim: meta.name,
      score,
      weight: w,
      contrib,
      tooltipText: `${score} × ${w.toFixed(1)}% = ${contrib.toFixed(1)} 分`,
      key: k
    };
  });
  chart = new Chart({ container: chartRef.value, autoFit: true });
  chart
    .interval()
    .data(data)
    .transform({ type: 'sortY', reverse: false })
    .encode('x', 'score')
    .encode('y', 'dim')
    .encode('color', (d: any) => colorFor(d.score))
    .scale('x', { domain: [0, 100] })
    .tooltip({
      title: (d: any) => d.dim,
      items: [
        { field: 'score', valueFormatter: (v: any) => `原始分 ${v}/100` },
        { field: 'weight', valueFormatter: (v: any) => `权重 ${v.toFixed(1)}%` },
        { field: 'contrib', valueFormatter: (v: any) => `贡献 ${v.toFixed(1)} 分` }
      ]
    })
    .label({
      text: 'tooltipText',
      position: 'right',
      style: { fontSize: 11, fill: '#374151' }
    })
    .axis('x', { title: '得分 (0-100)', labelFormatter: (v: any) => v });
  chart.render();
}

onMounted(render);
watch(() => [props.scores, props.weights, props.order, props.height], render, { deep: true });
onBeforeUnmount(() => { chart?.destroy(); chart = null; });
</script>
