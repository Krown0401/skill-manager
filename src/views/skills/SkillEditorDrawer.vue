<template>
  <el-drawer v-model="visible" :title="(initial && initial.name) || '新建 Skill'" size="560px" destroy-on-close>
    <el-form :model="form" label-width="110px">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-form-item label="名称" required>
            <el-input v-model="form.name" placeholder="Skill 显示名" />
          </el-form-item>
          <el-form-item label="描述" required>
            <el-input v-model="form.description" type="textarea" :rows="3" placeholder="这个 Skill 做什么" />
          </el-form-item>
          <el-form-item label="标签">
            <el-select v-model="form.tags" multiple filterable allow-create default-first-option style="width: 100%;" placeholder="回车新增标签" />
          </el-form-item>
          <el-form-item label="预计耗时">
            <el-input v-model="form.estimated_duration" placeholder="例如 10 分钟 / 1-2 小时" />
          </el-form-item>
          <el-form-item v-if="form.source_path" label="来源路径">
            <el-input v-model="form.source_path" disabled />
          </el-form-item>
        </el-tab-pane>

        <el-tab-pane label="前置条件 / 副作用" name="precond">
          <el-form-item label="前置条件">
            <el-select v-model="form.preconditions" multiple filterable allow-create default-first-option style="width: 100%;" placeholder="每行一个前置条件，回车新增" />
          </el-form-item>
          <el-form-item label="副作用">
            <el-select v-model="form.side_effects" multiple filterable allow-create default-first-option style="width: 100%;" placeholder="会产生哪些外部影响（写文件/调 API 等）" />
          </el-form-item>
          <el-form-item label="关联 Skill">
            <el-select v-model="form.related_skill_ids" multiple filterable style="width: 100%;" placeholder="选择相关的 Skill">
              <el-option v-for="s in others" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
        </el-tab-pane>

        <el-tab-pane label="输入 / 输出 Schema" name="schema">
          <el-alert type="info" :closable="false" style="margin-bottom: 12px;">
            输入/输出 JSON Schema 将在 M3 的「AI 补全」功能中自动填充；此处也可手动编辑 JSON。
          </el-alert>
          <el-form-item label="输入 Schema">
            <el-input v-model="inputJson" type="textarea" :rows="6" placeholder='{ "type": "object", "properties": {...} }' />
          </el-form-item>
          <el-form-item label="输出 Schema">
            <el-input v-model="outputJson" type="textarea" :rows="6" placeholder='{ "type": "object", "properties": {...} }' />
          </el-form-item>
        </el-tab-pane>
      </el-tabs>
    </el-form>

    <template #footer>
      <div style="text-align: right;">
        <el-space>
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="onSave">保存</el-button>
        </el-space>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import type { Skill, JSONSchema7Basic } from '@/shared/types/skill';
import { useSkillStore } from '@/stores/skill.store';

const props = defineProps<{ modelValue: boolean; initial: Skill | null }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; 'saved': [Skill] }>();

const store = useSkillStore();
const visible = computed({ get: () => props.modelValue, set: v => emit('update:modelValue', v) });
const activeTab = ref('basic');
const form = reactive<Skill>({
  id: '', name: '', description: '', source_type: 'manual',
  tags: [], preconditions: [], side_effects: [], related_skill_ids: [],
  created_at: 0, updated_at: 0
});
const inputJson = ref('');
const outputJson = ref('');

const others = computed(() => store.skills.filter(s => s.id !== form.id));

watch(() => props.initial, (v) => {
  if (v) {
    Object.assign(form, v);
    inputJson.value = v.input_schema ? JSON.stringify(v.input_schema, null, 2) : '';
    outputJson.value = v.output_schema ? JSON.stringify(v.output_schema, null, 2) : '';
  }
}, { immediate: true });

function tryParseJson(s: string): JSONSchema7Basic | undefined {
  if (!s.trim()) return undefined;
  try { return JSON.parse(s) as JSONSchema7Basic; }
  catch { return undefined; }
}

function onSave() {
  if (!form.name.trim()) return ElMessage.error('名称不能为空');
  if (!form.description.trim()) return ElMessage.error('描述不能为空');
  const input = tryParseJson(inputJson.value);
  const output = tryParseJson(outputJson.value);
  if (inputJson.value.trim() && !input) return ElMessage.error('输入 Schema JSON 格式错误');
  if (outputJson.value.trim() && !output) return ElMessage.error('输出 Schema JSON 格式错误');
  const saved: Skill = { ...form, input_schema: input, output_schema: output, updated_at: Date.now() };
  if (!saved.created_at) saved.created_at = saved.updated_at;
  emit('saved', saved);
}
</script>
