# _archive — 历史文档归档

> 2026-08-13 整理。这里的文档描述的是**过去某个阶段的状态**，不再反映项目现状。
> 保留它们是因为里面有调研记录、设计推理和已完成工作的细节，偶尔回溯有用。
>
> **判断现状请看**：`CLAUDE.md` + `README.md` + 实际代码 + `platform/src/lib/lab-files.json`，**不要**以这里的文档为准。

## 这里有什么

| 归档项 | 为什么归档 |
|--------|-----------|
| `HANDOFF.md` | 描述 4 月「5 人团队 + Sprint 计划」状态，章节编号已乱，会误导 |
| `WORK_LOG.md` | 指向已删除的 `PROJECT_BRIEFING.md` |
| `SECOND_BRAIN_PROMPT.md` | 2026-04-29 的旧「大脑提示词」，事实已过时，被根目录新提示词取代 |
| `开发前必看.md` | 接手导航链全部指向已删除文件（PROJECT_BRIEFING/PRD/ARCHITECTURE） |
| `TEAM_PROGRESS.md` | 全量快照（含 4 月会话 1–38 的平台/后端搭建流水账） |
| `LAB_DESIGN.md` | 描述「独立模块 + DI」架构，与实际「变体文件机制」矛盾 |
| `LAB01_PLATFORM_INTERACTION_SPEC.md` | 6-03 的 Lab 1 平台规格，已被后续重构推翻 |
| `Lab设计与评测机制-待决问题-2026-04-30.md` | 待决问题已决议（选定变体文件机制） |
| `FRONTEND_REDESIGN.md` / `AUTH_FRONTEND_PROMPT.md` | 旧前端计划/任务提示词，已落地或废弃 |
| `Docker镜像构建与部署备忘.md` | 部署信息已收敛到 `internal/华为云服务器运维手册.md` |
| `prompt/` | 30 个已完成任务的 Codex 提示词，历史留档 |
| `work-b/c/d/e/` | 旧团队分工目录；当前活跃契约只在 `internal/work-a-backend/` |
| `docs/platform/shared-AGENTS.md` | 6-03 生成的 AGENTS，已被 8-07 版本取代 |

## 如何恢复

所有归档都是 `git mv` 移入，可通过 git 历史随时找回。如需把某份文档重新作为活跃文档，从本目录移出并先核对其内容是否仍与代码一致。
