<template>
  <div>
    <div ref="chartRef" style="width: 100%; height: 360px;"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { Chart } from '@antv/g2';
import type { ReviewDimension } from '@/shared/types/review';
import { DEFAULT_DIMENSIONS } from '@/shared/constants/dimensions';

const props = defineProps<{
  scores: Record<ReviewDimension, number>;
  order: ReviewDimension[];
}>();

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
  const data = props.order.map((k, idx) => {
    const meta = DEFAULT_DIMENSIONS.find(d => d.key === k)!;
    return {
      item: `${idx + 1}. ${meta.name}`,
      score: props.scores[k] ?? 0,
      key: k
    };
  });
  chart = new Chart({ container: chartRef.value, autoFit: true });
  chart.coordinate({ type: 'polar' });
  chart
    .interval()
    .data(data)
    .encode('x', 'item')
    .encode('y', 'score')
    .encode('color', (d: any) => colorFor(d.score))
    .encode('shape', 'smooth')
    .scale('y', { domain: [0, 100], nice: true })
    .style('fillOpacity', 0.25)
    .style('lineWidth', 2)
    .tooltip({
      title: (d: any) => d.item,
      items: [{ channel: 'y', valueFormatter: (v: any) => `${v} 分` }]
    })
    .axis('x', { title: null });
  chart.line()
    .data(data)
    .encode('x', 'item')
    .encode('y', 'score')
    .encode('color', () => '#4f46e5')
    .style('lineWidth', 2);
  chart.point()
    .data(data)
    .encode('x', 'item')
    .encode('y', 'score')
    .encode('color', () => '#4f46e5')
    .encode('size', 4);
  chart.render();
}

onMounted(render);
watch(() => [props.scores, props.order], render, { deep: true });
onBeforeUnmount(() => { chart?.destroy(); chart = null; });
</script>
