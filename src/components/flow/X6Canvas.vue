<template>
  <div ref="containerRef" style="width: 100%; height: 100%; background: #fafafa;"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, shallowRef, onBeforeUnmount } from 'vue';
import { Graph } from '@antv/x6';
import type { SOPNode, SOPEdge } from '@/shared/types/sop';
import type { FindingSeverity } from '@/shared/types/review';

const props = defineProps<{
  nodes: SOPNode[];
  edges: SOPEdge[];
  highlightNodes?: Map<string, FindingSeverity>;
  readonly?: boolean;
}>();

const emit = defineEmits<{ 'node-click': [SOPNode] }>();

const containerRef = ref<HTMLDivElement>();
const graphRef = shallowRef<Graph | null>(null);

const TYPE_ATTRS: Record<string, any> = {
  start:     { body: { fill: '#d1fae5', stroke: '#059669', rx: 40, ry: 40 }, label: { fill: '#065f46', fontWeight: 700 } },
  end:       { body: { fill: '#fee2e2', stroke: '#dc2626', rx: 40, ry: 40 }, label: { fill: '#7f1d1d', fontWeight: 700 } },
  skill:     { body: { fill: '#dbeafe', stroke: '#2563eb', rx: 6, ry: 6 },   label: { fill: '#1e3a8a', fontWeight: 600 } },
  manual:    { body: { fill: '#f3e8ff', stroke: '#9333ea', rx: 6, ry: 6, strokeDasharray: '6 4' }, label: { fill: '#581c87', fontWeight: 600 } },
  condition: { body: { fill: '#fef3c7', stroke: '#d97706' }, label: { fill: '#78350f', fontWeight: 600 } },
  parallel:  { body: { fill: '#f3f4f6', stroke: '#4b5563', rx: 3, ry: 3 }, label: { fill: '#1f2937', fontWeight: 600 } }
};

function iconFor(t: string): string {
  return { start: '▶ ', end: '■ ', skill: '🧩 ', manual: '👤 ', condition: '❓ ', parallel: '≡ ' }[t] || '';
}

function ensureGraph() {
  if (!containerRef.value || graphRef.value) return;
  graphRef.value = new Graph({
    container: containerRef.value,
    panning: { enabled: true, modifiers: 'shift' },
    mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'], minScale: 0.3, maxScale: 2.5 },
    interacting: { nodeMovable: !props.readonly, edgeMovable: false, edgeLabelMovable: false, magnetConnectable: false },
    connecting: { allowBlank: false, allowLoop: false, allowNode: false, allowEdge: false },
    highlighting: { magnetAvailable: { name: 'stroke', args: { attrs: { stroke: '#409eff' } } } },
    background: { color: '#fafafa' },
    grid: { visible: true, size: 10, type: 'dot', args: { color: '#e5e7eb', thickness: 1 } }
  });
  graphRef.value.on('node:click', ({ node }) => {
    const n = props.nodes.find(x => x.id === node.id);
    if (n) emit('node-click', n);
  });
}

function sizeFrom(n: SOPNode): { w: number; h: number } {
  if (n.type === 'start' || n.type === 'end') return { w: 80, h: 80 };
  if (n.type === 'condition') return { w: 120, h: 80 };
  return { w: 180, h: 64 };
}

function render() {
  const g = graphRef.value;
  if (!g) return;
  g.clearCells();
  const highlight = props.highlightNodes ?? new Map<string, FindingSeverity>();
  props.nodes.forEach(n => {
    const attrs = JSON.parse(JSON.stringify(TYPE_ATTRS[n.type] || TYPE_ATTRS.skill));
    const sev = highlight.get(n.id);
    if (sev === 'critical') { attrs.body.stroke = '#ef4444'; attrs.body.strokeWidth = 3.5; }
    else if (sev === 'warning') { attrs.body.stroke = '#f59e0b'; attrs.body.strokeWidth = 3; }
    else if (sev === 'suggestion') { attrs.body.stroke = '#0ea5e9'; attrs.body.strokeWidth = 2.5; }
    if (highlight.size > 0 && !sev) attrs.body.opacity = 0.4;
    const { w, h } = sizeFrom(n);
    const x = n.position?.x ?? 100;
    const y = n.position?.y ?? 100;
    let shape: string = 'rect';
    if (n.type === 'start' || n.type === 'end') shape = 'circle';
    else if (n.type === 'condition') shape = 'polygon';
    const shapeCfg: any = {
      id: n.id, shape,
      x: x - w / 2, y: y - h / 2, width: w, height: h,
      label: iconFor(n.type) + n.title,
      attrs
    };
    if (shape === 'polygon') {
      shapeCfg.attrs.body.refPoints = '0,10 10,0 20,10 10,20';
      shapeCfg.width = 140; shapeCfg.height = 100;
    }
    g.addNode(shapeCfg);
  });
  props.edges.forEach(e => {
    const edge: any = {
      id: e.id,
      source: { cell: e.from },
      target: { cell: e.to },
      attrs: { line: { stroke: '#6b7280', strokeWidth: 1.5, targetMarker: 'block' } }
    };
    if (e.condition_label) {
      edge.labels = [{ attrs: { text: { text: e.condition_label, fill: '#374151' } } }];
    }
    g.addEdge(edge);
  });
  g.zoomToFit({ padding: 40, maxScale: 1 });
}

onMounted(() => {
  ensureGraph();
  render();
});

watch(() => [props.nodes, props.edges, props.highlightNodes?.size], () => {
  render();
}, { deep: true });

onBeforeUnmount(() => {
  graphRef.value?.dispose();
  graphRef.value = null;
});
</script>
