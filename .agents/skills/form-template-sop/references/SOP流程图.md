# SOP 流程图

```mermaid
flowchart TB
    subgraph SOP["form-template-sop Skill 流程"]
        direction TB

        Start([接收新单据配置任务])

        Step0["Step 0<br/>要素收集"]
        Step1["Step 1<br/>整合创建"]
        Step2["Step 2<br/>AI 分析 UI"]
        Step3["Step 3<br/>生成确认文档"]

        Review{人工 Review<br/>确认文档}

        Step4["Step 4<br/>OpenSpec<br/>规划中"]

        Creator["schema-creator Skill<br/>开始配置"]
    end

    Start --> Step0

    Step0 -->|"使用 jira-fetcher<br/>获取任务信息"| JiraData["Jira 任务详情<br/>离线文档"]

    Step1 -->|"整合要素<br/>创建任务文件夹"| DirStructure["📁 任务目录结构<br/>+ 任务元信息.json"]

    Step2 -->|"AI 凭视觉理解<br/>直接输出 JSON"| Step3

    Step3 --> Review

    Review -->|"确认通过"| Creator
    Review -->|"有异议"| Step3

    Creator -.-> Step4

    JiraData --> Step1

    DirStructure --> Step2

    Step1 -->|"tasks/<任务名>/"| SubDir["📂 原始资料/<br/>📂 分析结果/<br/>📂 确认文档/<br/>📂 配置产出/"]

    style Start fill:#e1f5fe
    style Step0 fill:#f3e5f5
    style Review fill:#fff3e0
    style Creator fill:#e8f5e9
```

## 流程说明

| 步骤 | 操作 | 说明 |
|------|------|------|
| **Step 0** | 要素收集 | 使用 `jira-fetcher` Skill 获取 Jira 任务信息 |
| Step 1 | 整合创建任务文件夹 | 整合要素 + 创建标准化任务目录 |
| Step 2 | AI 分析 UI | AI 看截图，凭视觉理解直接输出 JSON |
| Step 3 | 生成确认文档 | AI 结合分析结果生成 `.md` 确认文档 |
| **人工 Review** | **关键卡点** | 确认通过后才进入 schema-creator |
| 循环 | Review 有异议 | 回到 Step 3 调整确认文档 |

## 必需要素

| 要素 | 说明 | 来源 |
|------|------|------|
| JIRA 链接 | 工单/任务的 Jira 地址 | 用户提供 |
| 院区 | 如：华西医院、湖南人民医院 | 从 JIRA 解析或用户提供 |
| 单据名称 | 如：国外进修申请 | 从 JIRA 解析或用户提供 |
| 单据类型 | 如：事前申请、报销单 | 从 JIRA 解析或用户提供 |
| 目标端 | PC / 移动端 | 用户指定 |

## 任务目录结构

```
tasks/<任务名>/
├── 原始资料/      # UI 截图、接口文档
├── 分析结果/      # AI 输出的 JSON
├── 确认文档/      # 人工 Review 的 .md
└── 配置产出/      # 最终 form.json

任务元信息.json    # JIRA链接、院区、单据名称等要素
```

## 任务名称格式

`{Jira编号}-{单据简称}`，如 `YLZHXT-4428-科室进修批次申请`