<template>
  <el-container class="layout-root" style="height: 100vh;">
    <el-aside width="220px" style="background: #001529; color: #fff;">
      <div style="padding: 18px 16px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #1f3a5f;">
        🛠 Skill SOP 编排工具
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#001529"
        text-color="#cfd8e3"
        active-text-color="#409eff"
        style="border-right: none;"
      >
        <el-menu-item index="/dashboard">🏠 首页</el-menu-item>
        <el-menu-item index="/skills">🛠  Skill 库管理</el-menu-item>
        <el-menu-item index="/sop-generator">✨ SOP 智能生成</el-menu-item>
        <el-menu-item index="/sop-review">🔍 SOP 审查优化</el-menu-item>
        <el-sub-menu index="settings-menu">
          <template #title>⚙️ 设置</template>
          <el-menu-item index="/settings/llm">LLM 配置</el-menu-item>
          <el-menu-item index="/settings/storage">存储与扫描</el-menu-item>
          <el-menu-item index="/settings/about">关于</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="background: #fff; border-bottom: 1px solid #ebeef5; display: flex; align-items: center;">
        <h3 style="margin: 0;">{{ $route.meta.title as string }}</h3>
      </el-header>
      <el-main style="background: #f5f7fa;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
</script>

<style>
html, body, #app { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
</style>
