<template>
  <div style="height: calc(100vh - 180px); min-height: 560px;">
    <el-card style="height: 100%;">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <el-input v-model="sop?.name" size="default" style="width: 340px; margin-right: 12px;" />
            <el-tag type="info" size="small">{{ sop?.version }}</el-tag>
            <el-tag v-if="sop?.source" :type="sop.source === 'generated' ? 'success' : 'warning'" size="small" style="margin-left: 6px;">
              {{ sop.source === 'generated' ? '生成' : '导入' }}
            </el-tag>
          </div>
          <el-space>
            <el-button @click="onExport('json')">📄 导出 JSON</el-button>
            <el-button @click="onExport('md')">📝 导出 Markdown</el-button>
            <el-button type="primary" @click="onSave">💾 保存</el-button>
          </el-space>
        </div>
      </template>

      <el-row :gutter="12" style="height: 100%;">
        <el-col :span="17" style="height: 100%;">
          <div style="margin-bottom: 8px;">
            <el-input v-model="sop?.goal" type="textarea" :rows="2" placeholder="SOP 目标描述..." />
          </div>
          <div style="height: calc(100% - 88px); border: 1px solid #ebeef5; border-radius: 6px; overflow: hidden;">
            <X6Canvas v-if="sop" :nodes="sop.nodes" :edges="sop.edges" readonly @node-click="onNodeClick" />
            <el-empty v-else description="加载中..." />
          </div>
        </el-col>

        <el-col :span="7" style="height: 100%; overflow-y: auto;">
          <div v-if="selectedNode" style="margin-bottom: 12px;">
            <el-descriptions :column="1" border size="default" title="节点详情">
              <el-descriptions-item label="类型"><el-tag size="small">{{ selectedNode.type }}</el-tag></el-descriptions-item>
              <el-descriptions-item label="标题">
                <el-input v-model="selectedNode.title" size="small" />
              </el-descriptions-item>
              <el-descriptions-item v-if="selectedNode.description" label="描述">
                <el-input v-model="selectedNode.description" type="textarea" :rows="3" size="small" />
              </el-descriptions-item>
              <el-descriptions-item v-if="selectedNode.skill_id" label="关联 Skill">
                <el-tag type="primary" size="small">{{ skillName(selectedNode.skill_id) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item v-if="selectedNode.condition_expr" label="条件表达式">
                <code style="word-break: break-all;">{{ selectedNode.condition_expr }}</code>
              </el-descriptions-item>
              <el-descriptions-item v-if="selectedNode.manual_checklist?.length" label="人工确认项">
                <ul style="margin: 0; padding-left: 18px;">
                  <li v-for="(c, i) in selectedNode.manual_checklist" :key="i" style="margin-bottom: 4px;">{{ c }}</li>
                </ul>
              </el-descriptions-item>
            </el-descriptions>
          </div>
          <el-empty v-else description="点击左侧节点查看详情" :image-size="80" />

          <el-divider content-position="left">成功标准</el-divider>
          <el-timeline v-if="sop?.success_criteria?.length">
            <el-timeline-item v-for="(c, i) in sop.success_criteria" :key="i" type="primary">{{ c }}</el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无成功标准，可在编辑中补充" :image-size="60" />

          <el-divider content-position="left" v-if="sop?.explanation">编排说明</el-divider>
          <el-alert v-if="sop?.explanation" type="info" :closable="false" show-icon>
            {{ sop.explanation }}
          </el-alert>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { SOP, SOPNode } from '@/shared/types/sop';
import { useSOPStore } from '@/stores/sop.store';
import { useSkillStore } from '@/stores/skill.store';
import X6Canvas from '@/components/flow/X6Canvas.vue';

const route = useRoute();
const router = useRouter();
const sopStore = useSOPStore();
const skillStore = useSkillStore();

const sop = ref<SOP | null>(null);
const selectedNode = ref<SOPNode | null>(null);

function skillName(id: string): string {
  return skillStore.skillMap.get(id)?.name || id;
}

function onNodeClick(n: SOPNode) {
  selectedNode.value = n;
}

async function onSave() {
  if (!sop.value) return;
  await sopStore.save(sop.value);
  ElMessage.success('已保存');
}

async function onExport(format: 'json' | 'md') {
  if (!sop.value) return;
  const result = await sopStore.exportSOP(sop.value.id, format);
  // 浏览器端触发下载
  const blob = new Blob([result.content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = result.filename; a.click();
  URL.revokeObjectURL(url);
  ElMessage.success('已导出：' + result.filename);
}

onMounted(async () => {
  await skillStore.load();
  const id = route.params.id as string;
  const loaded = await sopStore.get(id);
  if (!loaded) {
    ElMessage.error('SOP 不存在');
    router.replace('/sop-generator');
    return;
  }
  sop.value = loaded;
});
</script>
