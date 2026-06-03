# Lab 开发与平台同步手册

> 面向 AI agent 和团队成员：开发新 Lab 或更新现有 Lab 时，如何确保姐妹仓库、Docker 镜像、平台前端三者的内容一致。

## 核心架构：三条独立的数据管道

理解这个系统的关键是：**有三个地方存储文件内容，它们互不自动同步**。

```
管道 1：Docker 镜像（容器内执行）
  claude-code-diy 姐妹仓库的 -lab0 文件
       ↓ build-lab-image.sh
  Docker 镜像 /workspace/src/...
       ↓ 学习者点"提交" → injectFiles()
  容器内执行 build.mjs --lab=0

管道 2：前端编辑器（学习者看到的初始代码）
  platform/src/lib/lab-files.json
       ↓ getLabInitialFiles()
  Monaco 编辑器显示 skeleton 内容

管道 3：已保存的 workspace（学习者之前的编辑）
  server/byocc.sqlite → code_snapshots 表
       ↓ GET /api/labs/:id/workspace
  覆盖编辑器的初始内容（优先级最高）
```

**优先级**：已保存 workspace > lab-files.json > Docker 镜像（镜像内容前端不直接读取）

## 一、完整开发流程（新 Lab 或更新 Lab）

### Step 1：在姐妹仓库创建/更新 -lab 文件

文件位置：`D:\test-claude-code\claude-code\src\`（或服务器上的 claude-code-diy 路径）

命名规则：`<原始文件名>-lab<N>.<ext>`，例如 `Clawd-lab0.tsx`、`query-lab3.ts`

```bash
cd D:/test-claude-code/claude-code

# 复制原始文件并加后缀
cp src/components/LogoV2/Clawd.tsx src/components/LogoV2/Clawd-lab0.tsx

# 编辑 -lab0 文件，把学习者需要修改的部分替换为 TODO 注释
# 保留所有非视觉/非品牌逻辑代码不变

# 验证构建
node build.mjs --lab=0
# 应该看到 "Swapped ... ← ..." 的替换日志

# 提交到姐妹仓库
git add src/components/LogoV2/Clawd-lab0.tsx  # 以及其他 -lab0 文件
git commit -m "feat: add Lab 0 skeleton files"
git push origin main
```

### Step 2：更新平台 lab-files.json

这一步把姐妹仓库的文件内容同步到前端编辑器。

**方法 A：自动脚本（推荐）**

```bash
# 在 byocc 项目根目录执行
cd D:/code/build-your-own-claude-code

node -e "
const fs = require('fs');
const path = require('path');

// === 配置：要同步的 Lab 编号和文件列表 ===
const LAB_NUMBER = 0;  // 改成你要更新的 Lab 编号
const SISTER_REPO = 'D:/test-claude-code/claude-code';  // 姐妹仓库路径

// 列出这个 Lab 的所有 -lab 文件
const files = [
  { path: 'src/components/LogoV2/Clawd-lab0.tsx', editable: true },
  { path: 'src/components/LogoV2/WelcomeV2-lab0.tsx', editable: true },
  { path: 'src/components/LogoV2/LogoV2-lab0.tsx', editable: true },
  { path: 'src/components/LogoV2/CondensedLogo-lab0.tsx', editable: true },
  { path: 'src/entrypoints/cli-lab0.tsx', editable: true },
  { path: 'src/main-lab0.tsx', editable: true },
];

function stripSourceMap(content) {
  const idx = content.indexOf('//# sourceMappingURL=data:');
  return idx !== -1 ? content.substring(0, idx).trimEnd() : content;
}

const labFiles = files.map(f => {
  const fullPath = path.join(SISTER_REPO, f.path);
  let content = fs.readFileSync(fullPath, 'utf8');
  content = stripSourceMap(content);
  return { path: f.path, editable: f.editable, skeleton: content };
});

const targetPath = 'platform/src/lib/lab-files.json';
const existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
existing[LAB_NUMBER] = labFiles;
fs.writeFileSync(targetPath, JSON.stringify(existing, null, 2) + '\n');

console.log('Updated lab ' + LAB_NUMBER + ': ' + labFiles.length + ' files');
labFiles.forEach(f => console.log('  ' + f.path + ' (' + (f.skeleton.length/1024).toFixed(1) + ' KB)'));
"
```

**方法 B：手动编辑**

直接编辑 `platform/src/lib/lab-files.json`，把对应 Lab 的 `skeleton` 字段替换为文件内容。
注意 JSON 中的换行要用 `\n`，引号要用 `\"`。

### Step 3：同步服务端 generated 文件

```bash
cd D:/code/build-your-own-claude-code/server
node scripts/generate-lab-config.mjs
# 输出：[generate-lab-config] Wrote .../lab-files-generated.ts
```

这个脚本把 `platform/src/lib/lab-files.json` 的内容复制为 TypeScript 常量给后端用。
**每次修改 lab-files.json 都必须执行这一步**。

### Step 4：清除旧数据库记录

如果之前有用户保存过旧版本的 workspace，数据库中的旧内容会覆盖新的 skeleton。
需要清除对应 Lab 的快照：

```bash
cd D:/code/build-your-own-claude-code/server

# 查看现有快照
node -e "
const Database = require('better-sqlite3');
const db = new Database('byocc.sqlite');
const rows = db.prepare('SELECT user_id, lab_number, length(code) as size, updated_at FROM code_snapshots ORDER BY lab_number').all();
rows.forEach(r => console.log('Lab ' + r.lab_number + ' | user=' + r.user_id.substring(0,8) + '... | ' + (r.size/1024).toFixed(1) + 'KB | ' + r.updated_at));
db.close();
"

# 清除某个 Lab 的所有快照（将 0 改为对应 Lab 编号）
node -e "
const Database = require('better-sqlite3');
const db = new Database('byocc.sqlite');
const result = db.prepare('DELETE FROM code_snapshots WHERE lab_number = 0').run();
console.log('Deleted:', result.changes, 'rows');
db.close();
"
```

**在华为云服务器上**，同样的操作：
```bash
cd /root/build-your-own-claude-code/server
# 然后执行相同的 node -e "..." 命令
```

### Step 5：重新构建 Docker 镜像

```bash
cd D:/code/build-your-own-claude-code

# 本地构建（Windows）
.\infrastructure\build-lab-image.ps1 -RuntimeRepoPath "D:\test-claude-code\claude-code" -ImageName byocc-lab

# 或 Linux/macOS
./infrastructure/build-lab-image.sh /path/to/claude-code-diy byocc-lab
```

华为云服务器上也需要重新构建或导入镜像。

### Step 6：验证

1. 本地启动前端：`cd platform && npm run dev`
2. 打开 `http://localhost:3000/lab/<N>`
3. 检查编辑器是否显示新的 skeleton 内容
4. 如果还是旧内容 → 检查数据库是否有旧快照（Step 4）
5. 点击提交，验证构建是否成功

## 二、lab-files.json 结构说明

```json
{
  "0": [
    {
      "path": "src/components/LogoV2/Clawd-lab0.tsx",
      "editable": true,
      "skeleton": "// 完整文件内容..."
    }
  ],
  "1": [...],
  "2": [...],
  "3": [...],
  "4": [...],
  "5": [...]
}
```

- `path`：容器内的文件路径（相对于 /workspace/），也是编辑器中显示的路径
- `editable`：`true` = 学习者可编辑，`false` = 只读（从容器读取）
- `skeleton`：编辑器显示的初始内容，必须是**完整文件**（提交时会覆盖容器内文件）

### 关于文件大小

如果 -lab 文件很大（>100KB），检查是否包含 inline source map：
```
//# sourceMappingURL=data:application/json;charset=utf-8;base64,...
```
如果有，在写入 skeleton 之前需要剥离。上面的同步脚本已包含 `stripSourceMap()` 处理。

## 三、已保存 Workspace 的覆盖机制

```typescript
// LabRightArea.tsx bootstrap() 中的合并逻辑：
const mergedFiles = {
  ...initialFiles,      // 来自 lab-files.json（新内容）
  ...workspace.files,   // 来自数据库（旧内容，会覆盖上面）
};
```

**数据库中的旧 workspace 会覆盖 lab-files.json 的新 skeleton**。这意味着：
- 即使更新了 lab-files.json，如果数据库里有旧快照，编辑器仍然显示旧内容
- 更新 Lab 内容后，**必须清除对应 Lab 的数据库快照**

## 四、文档面板的 index.md / tasks.md

Lab 页面左侧文档区支持两个文档的切换显示。

### 文件位置

```
docs/labs/
├── lab-00/
│   ├── index.md   ← 知识讲解（默认显示）
│   └── tasks.md   ← 实验任务（点击切换）
├── lab-01/
│   ├── index.md
│   └── tasks.md
...
```

### 渲染机制

- `page.tsx` 服务端同时读取 `index.md` 和 `tasks.md`
- `DocsPanel` 组件在标题栏右侧显示「知识点 | 实验任务」切换按钮
- 切换是纯前端状态，不需要页面刷新
- 如果某个 Lab 没有 `tasks.md`，切换按钮自动隐藏

### 添加新文档

只需在 `docs/labs/lab-XX/` 目录下创建或编辑 `index.md` / `tasks.md`，无需修改任何代码。

## 五、检查清单（每次更新 Lab 内容）

- [ ] 姐妹仓库的 -lab 文件已更新并 push
- [ ] `platform/src/lib/lab-files.json` 的 skeleton 已更新
- [ ] `node server/scripts/generate-lab-config.mjs` 已执行
- [ ] Docker 镜像已重新构建
- [ ] 数据库中对应 Lab 的 code_snapshots 已清除
- [ ] 前端验证：编辑器显示新内容
- [ ] 华为云服务器已 pull 代码并重启服务
- [ ] 华为云服务器数据库已清除旧快照
- [ ] 华为云服务器 Docker 镜像已更新
