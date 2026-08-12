import type { SOP } from '../../src/shared/types/sop';

/**
 * 给没有 position 的节点分配坐标。简单拓扑分层：BFS 从 start 出发按 depth 分层，每层水平排列。
 */
export function applyAutoLayout(sop: SOP): void {
  const start = sop.nodes.find(n => n.type === 'start');
  if (!start) return;
  const inMap = new Map<string, string[]>();
  const outMap = new Map<string, string[]>();
  sop.nodes.forEach(n => { inMap.set(n.id, []); outMap.set(n.id, []); });
  sop.edges.forEach(e => {
    outMap.get(e.from)!.push(e.to);
    inMap.get(e.to)!.push(e.from);
  });
  const depth = new Map<string, number>();
  const visited = new Set<string>();
  const queue: [string, number][] = [[start.id, 0]];
  while (queue.length) {
    const [id, d] = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    depth.set(id, d);
    outMap.get(id)!.forEach(nid => queue.push([nid, d + 1]));
  }
  // 未访问到的节点放到最后一层
  const last = Math.max(0, ...depth.values());
  sop.nodes.forEach(n => { if (!depth.has(n.id)) depth.set(n.id, last + 1); });

  const layers = new Map<number, string[]>();
  depth.forEach((d, id) => {
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(id);
  });

  const H_GAP = 180;
  const V_GAP = 120;
  const layerIds = [...layers.keys()].sort((a, b) => a - b);
  layerIds.forEach(d => {
    const ids = layers.get(d)!;
    const total = ids.length;
    const startX = total === 1 ? 400 : 400 - ((total - 1) * H_GAP) / 2;
    ids.forEach((id, i) => {
      const node = sop.nodes.find(n => n.id === id)!;
      if (!node.position) node.position = { x: 0, y: 0 };
      node.position.x = startX + i * H_GAP;
      node.position.y = 60 + d * V_GAP;
    });
  });
}
