<template>
  <el-empty v-if="!items.length" description="此级别暂无发现，表现优秀 👍" />
  <el-collapse v-else accordion style="border: none;">
    <el-collapse-item v-for="f in items" :key="f.id" :name="f.id">
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding-right: 12px;">
          <div>
            <el-tag size="small" :type="sevTag(f.severity)" effect="dark" style="margin-right: 8px;">
              {{ dimName(f.dimension) }}
            </el-tag>
            <strong>{{ f.title }}</strong>
          </div>
          <div v-if="f.related_node_ids?.length" style="font-size: 12px; color: #6b7280;">
            相关节点：
            <el-link
              v-for="nid in f.related_node_ids"
              :key="nid"
              type="primary"
              :underline="false"
              style="margin-left: 4px;"
              @click.stop="$emit('focusNode', nid)"
            >{{ nid }}</el-link>
          </div>
        </div>
      </template>
      <div style="padding: 4px 8px;">
        <div style="margin-bottom: 10px;">
          <strong>📝 详情：</strong>
          <span style="white-space: pre-wrap;">{{ f.detail }}</span>
        </div>
        <div v-if="f.suggestion" style="margin-bottom: 10px; padding: 10px; background: #eff6ff; border-left: 3px solid #2563eb; border-radius: 4px;">
          <strong style="color: #1d4ed8;">💡 优化建议：</strong>
          <span>{{ f.suggestion }}</span>
        </div>
        <el-tag v-if="f.suspected_parse_error" type="danger" size="small" effect="plain">
          ⚠️ 与 Markdown 解析疑似误差相关，建议优先人工确认原 SOP
        </el-tag>
      </div>
    </el-collapse-item>
  </el-collapse>
</template>

<script setup lang="ts">
import type { ReviewFinding, ReviewDimension } from '@/shared/types/review';
import { DEFAULT_DIMENSIONS } from '@/shared/constants/dimensions';

defineProps<{ items: ReviewFinding[] }>();
defineEmits<{ 'focusNode': [string | null] }>();

function sevTag(s: string) {
  return s === 'critical' ? 'danger' : s === 'warning' ? 'warning' : 'info';
}
function dimName(k: ReviewDimension): string {
  return DEFAULT_DIMENSIONS.find(d => d.key === k)?.name ?? k;
}
</script>
