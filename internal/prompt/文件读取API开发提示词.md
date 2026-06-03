# 文件读取 API + 前端只读文件查看 — 开发提示词

> 给新的 Claude Code 会话使用。
> 工作目录：D:\code\build-your-own-claude-code
> 分支建议：从 main 新建 `feat/file-read-api`

---

## 项目背景

**Build Your Own Claude Code (BYOCC)** 教学平台。认证系统 + API Key 管理已完成并合并 main。

### 核心用户流程

```
1. 访问 / 首页 → /platform 选择 Lab → 检测登录 → /login
2. /lab/:id 实验工作台
   - 左侧：文件目录树 + 文档面板
   - 右侧：Monaco 编辑器 + 终端
3. 点击"启动实验环境" → 后端创建 Docker 容器（注入 API Key ENV）
4. 编辑代码 → "提交" → 注入容器 → 构建
5. 终端运行 node cli.js → 看到真实 Claude Code TUI
```

### 本次任务

**实现容器内文件的只读查看功能**：用户点击文件目录树中的只读文件（🔒 标记），通过 API 从 Docker 容器内读取文件内容，在 Monaco 编辑器中以只读模式展示。

---

## 当前代码状态（必须先了解）

### 后端关键文件

**`server/src/services/container-manager.ts`** — 容器管理
- `resolveContainer(sessionId)` — 通过 sessionId 找到容器（行 ~90）
- `runExecCommand(container, command)` — 在容器内执行命令（行 ~180）
- `getContainerOrThrow(sessionId)` — 找容器或抛错（行 ~170）
- 已有的 exec 调用模式（injectCode、buildInContainer 都用 `runExecCommand`）

**`server/src/middleware/auth.ts`** — 认证中间件
- `requireAuth(req, res, next)` — 验证 JWT cookie（行 53）
- `requireSessionAccess(req, session)` — 校验 session 归属（行 86）
- 返回 `{ ok: true, user, shouldBindSession }` 或 `{ ok: false, statusCode, message }`

**`server/src/db/database.ts`** — 数据库
- `getSession(sessionId)` — 获取 session 记录（含 `user_id`, `container_id`）

**`server/src/index.ts`** — 路由注册
- 所有路由用 `app.use(router)` 注册，路由内部定义完整路径（如 `'/api/submit'`）

### 前端关键文件

**`platform/src/lib/file-tree-data.ts`** — 文件树静态数据
- `FILE_TREE: FileTreeNode[]` — 完整文件树（18 个文件 + 7 个目录）
- `LAB_EDITABLE_FILES: Record<number, string[]>` — 每个 Lab 可编辑的文件列表
- 没有 "read-only" 字段，而是通过排除法：不在 `LAB_EDITABLE_FILES[labId]` 中的就是只读

**`platform/src/components/FileTree.tsx`** — 文件目录树组件
- `FileTreeNodeRow` 组件中，只读文件点击后**什么都不做**（行 ~95）：
  ```typescript
  onClick={() => {
    if (isEditable) {
      onFileSelect(node.path);  // 只在可编辑时触发
    }
  }}
  ```
- 可编辑文件显示 ⭐ 图标 + 琥珀金高亮
- 只读文件显示 🔒 图标 + 灰色文字

**`platform/src/components/LabRightArea.tsx`** — 右侧编辑区
- 传给 FileTree 的 `onFileSelect={() => {}}` — **是空操作**（行 ~165 附近）
- 管理 `code` 状态（工作区代码）和自动保存逻辑
- `environmentStatus` 追踪容器运行状态

**`platform/src/components/CodeEditor.tsx`** — Monaco 编辑器
- 当前 props：`{ code, fileName, onChange }`
- **没有 `readOnly` prop**，需要新增
- 使用 `@monaco-editor/react`，options 中加 `readOnly: true` 即可

### 前端 API 客户端模式

项目有两种 API 调用模式：

1. **`platform/src/lib/api.ts`** — 旧模式（`authorizedFetch`，处理匿名 token）
   - 复杂的 fallback 逻辑（cookie auth → bearer token → anonymous token）
   - 适合需要兼容匿名访问的 API

2. **`platform/src/lib/settings.ts`** — 新模式（直接 `fetch` + `credentials: 'include'`）
   - 简洁，只有 `apiUrl` 辅助函数 + `credentials: 'include'`
   - 适合必须登录的 API（如文件读取）

**文件读取 API 必须登录，使用 settings.ts 的模式。**

---

## 后端实现

### Step 1: 新建 `server/src/routes/files.ts`

```typescript
import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getSession } from '../db/database.js';
import { resolveContainer, runExecCommand } from '../services/container-manager.js';

export const filesRouter = Router();

// GET /api/files/:path(*)?sessionId=xxx
// 从容器内读取文件内容
filesRouter.get('/api/files/:path(*)', requireAuth, async (req, res) => {
  // 1. 提取参数
  const filePath = req.params.path;      // 如 "src/query.ts"
  const sessionId = req.query.sessionId as string | undefined;
  const user = (req as AuthenticatedRequest).user;

  // 2. 参数校验
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: '缺少文件路径' });
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: '缺少 sessionId' });
  }

  // 3. 安全校验：路径穿越防护
  if (filePath.includes('..')) {
    return res.status(400).json({ error: '路径不允许包含 ".."' });
  }
  if (filePath.startsWith('/')) {
    return res.status(400).json({ error: '路径不允许以 / 开头' });
  }
  if (!/^[a-zA-Z0-9_/.-]+$/.test(filePath)) {
    return res.status(400).json({ error: '路径包含非法字符' });
  }

  // 4. Session 归属校验
  const session = getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session 不存在' });
  }
  if (session.userId && session.userId !== user.id) {
    return res.status(403).json({ error: '无权访问该 Session' });
  }

  // 5. 查找容器
  const resolved = await resolveContainer(sessionId);
  if (!resolved) {
    return res.status(404).json({ error: '容器不存在，请先启动实验环境' });
  }
  if (resolved.info.State.Status !== 'running') {
    return res.status(400).json({ error: '容器未运行，请先启动实验环境' });
  }

  // 6. 读取文件（带大小限制）
  const MAX_SIZE = 100 * 1024; // 100KB
  try {
    const { exitCode, output } = await runExecCommand(resolved.container, [
      'bash', '-c',
      `cat "/workspace/${filePath}" | head -c ${MAX_SIZE + 1}`
    ]);

    if (exitCode !== 0) {
      return res.status(404).json({ error: '文件不存在或无法读取' });
    }
    if (output.length > MAX_SIZE) {
      return res.status(413).json({ error: '文件过大，最大支持 100KB' });
    }

    // 7. 推断语言
    const language = inferLanguage(filePath);

    res.json({ path: filePath, content: output, language });
  } catch (err) {
    res.status(500).json({ error: '读取文件失败' });
  }
});

function inferLanguage(filePath: string): string {
  if (filePath.endsWith('.ts')) return 'typescript';
  if (filePath.endsWith('.tsx')) return 'typescript';
  if (filePath.endsWith('.js')) return 'javascript';
  if (filePath.endsWith('.mjs')) return 'javascript';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.md')) return 'markdown';
  return 'plaintext';
}
```

### Step 2: 修改 `server/src/index.ts`

在路由注册区域添加 filesRouter：

```typescript
import { filesRouter } from './routes/files.js';
// ... 在其他路由注册之后
app.use(filesRouter);
```

---

## 前端对接

### Step 3: 新建 `platform/src/lib/file-reader.ts`

遵循 `settings.ts` 的 API 客户端模式：

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface FileContent {
  path: string;
  content: string;
  language: string;
}

function apiUrl(path: string): string {
  if (!API_BASE) return path;
  try {
    const url = new URL(API_BASE);
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      return path;
    }
  } catch {
    return path;
  }
  return `${API_BASE}${path}`;
}

export async function fetchFileContent(
  filePath: string,
  sessionId: string,
): Promise<FileContent> {
  const response = await fetch(
    apiUrl(`/api/files/${encodeURIComponent(filePath)}?sessionId=${encodeURIComponent(sessionId)}`),
    { credentials: "include" },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "读取文件失败" }));
    throw new Error((data as { error?: string }).error ?? "读取文件失败");
  }
  return response.json() as Promise<FileContent>;
}
```

### Step 4: 修改 `platform/src/components/CodeEditor.tsx`

新增 `readOnly` 和 `language` props：

```typescript
type CodeEditorProps = {
  code: string;
  fileName: string;
  language?: string;        // 新增，默认 "typescript"
  readOnly?: boolean;       // 新增，默认 false
  onChange: (value: string) => void;
};

// 在 options 中加入：
options={{
  // ... 现有 options
  readOnly: readOnly ?? false,
}}
```

只读模式下，文件名旁显示 🔒 标记，编辑器背景略有变化（如加一层半透明遮罩感）。

### Step 5: 修改 `platform/src/components/FileTree.tsx`

修改 `FileTreeProps` 和 `FileTreeNodeRow`：

```typescript
// Props 增加只读文件点击回调
type FileTreeProps = {
  labId: number;
  onFileSelect: (path: string, isEditable: boolean) => void;  // 改签名
};

// FileTreeNodeRow 中，所有文件都能点击
onClick={() => {
  onFileSelect(node.path, isEditable);  // 统一回调
}}
```

同时移除只读文件的 `cursor-not-allowed` 样式（如果有的话），改为正常 hover 效果但保持 🔒 图标和灰色文字。

### Step 6: 修改 `platform/src/components/LabRightArea.tsx`

这是改动最多的文件。需要管理两种编辑器模式：

```typescript
// 新增状态
const [viewingFile, setViewingFile] = useState<string | null>(null);
const [readOnlyContent, setReadOnlyContent] = useState<string | null>(null);
const [readOnlyLanguage, setReadOnlyLanguage] = useState<string>("typescript");
const [readOnlyLoading, setReadOnlyLoading] = useState(false);
const [readOnlyError, setReadOnlyError] = useState<string | null>(null);

// 文件点击处理
const handleFileSelect = async (path: string, isEditable: boolean) => {
  if (isEditable) {
    // 切回可编辑模式：恢复工作区代码
    setViewingFile(null);
    setReadOnlyContent(null);
    return;
  }

  // 只读模式
  if (environmentStatus !== "running") {
    setReadOnlyError("请先启动实验环境再查看文件");
    return;
  }

  setViewingFile(path);
  setReadOnlyLoading(true);
  setReadOnlyError(null);
  try {
    const result = await fetchFileContent(path, sessionId);
    setReadOnlyContent(result.content);
    setReadOnlyLanguage(result.language);
  } catch (err) {
    setReadOnlyError(err instanceof Error ? err.message : "读取文件失败");
  } finally {
    setReadOnlyLoading(false);
  }
};

// 传给 FileTree
<FileTree labId={lab.id} onFileSelect={handleFileSelect} />

// 传给 CodeEditor
<CodeEditor
  code={viewingFile ? (readOnlyContent ?? "") : code}
  fileName={viewingFile ?? LAB_FILE_NAMES[lab.id] ?? "main.ts"}
  language={viewingFile ? readOnlyLanguage : undefined}
  readOnly={!!viewingFile}
  onChange={viewingFile ? () => {} : handleCodeChange}
/>
```

**UI 展示**：
- 只读模式时，在 ActionBar 区域显示一个蓝色小标签 "只读: {fileName}"，点击可切回编辑模式
- 加载中显示 Monaco loading skeleton
- 错误时显示错误信息 + "重试"按钮

---

## 接口契约

### GET /api/files/:path(*)?sessionId=xxx

**请求**：
```
GET /api/files/src/query.ts?sessionId=abc-123
Cookie: byocc_session=JWT
```

**成功响应** (200)：
```json
{
  "path": "src/query.ts",
  "content": "// Agent Loop 核心\nwhile (true) { ... }",
  "language": "typescript"
}
```

**错误响应**：
| 状态码 | 场景 | error 消息 |
|--------|------|-----------|
| 400 | 缺少路径/sessionId | "缺少文件路径" / "缺少 sessionId" |
| 400 | 路径包含 .. | "路径不允许包含 '..'" |
| 400 | 路径以 / 开头 | "路径不允许以 / 开头" |
| 400 | 非法字符 | "路径包含非法字符" |
| 401 | 未登录 | "Missing or invalid auth token." |
| 403 | session 不属于当前用户 | "无权访问该 Session" |
| 404 | session 不存在 | "Session 不存在" |
| 404 | 容器不存在 | "容器不存在，请先启动实验环境" |
| 404 | 文件不存在 | "文件不存在或无法读取" |
| 413 | 文件超过 100KB | "文件过大，最大支持 100KB" |
| 500 | exec 失败 | "读取文件失败" |

---

## 安全校验清单

开发完成后逐项确认：

- [ ] 路径穿越防护：`../etc/passwd` → 400
- [ ] 绝对路径防护：`/etc/passwd` → 400
- [ ] 特殊字符防护：`src/file;rm -rf /` → 400
- [ ] Session 归属校验：非 owner 访问 → 403
- [ ] 未登录访问 → 401
- [ ] 容器未运行 → 400 + 友好提示
- [ ] 文件超过 100KB → 413
- [ ] 不存在的文件 → 404
- [ ] 不存在的 session → 404
- [ ] cat 命令中的路径被双引号包裹（防止空格注入）

---

## 验证步骤

```bash
# 1. 类型检查
npx tsc --noEmit --project server/tsconfig.json
npx tsc --noEmit --project platform/tsconfig.json

# 2. 构建
cd server && npm run build
cd platform && npm run build

# 3. API 手动测试（需要后端运行 + 容器运行）
# 正常读取
curl "http://127.0.0.1:3001/api/files/src/query.ts?sessionId=YOUR_SESSION" \
  -b "byocc_session=YOUR_JWT"

# 路径穿越
curl "http://127.0.0.1:3001/api/files/../../../etc/passwd?sessionId=YOUR_SESSION" \
  -b "byocc_session=YOUR_JWT"
# → 400

# 未登录
curl "http://127.0.0.1:3001/api/files/src/query.ts?sessionId=YOUR_SESSION"
# → 401

# 容器未运行
# （先停止容器再测试）
# → 400 + "容器未运行"
```

---

## 不动的文件

```
不要修改：
  server/src/routes/auth.ts
  server/src/routes/terminal.ts
  server/src/routes/settings.ts
  server/src/middleware/auth.ts
  server/src/services/encryption.ts
  server/src/db/database.ts
  platform/src/lib/api.ts
  platform/src/lib/auth.ts
  platform/src/lib/settings.ts
  platform/src/lib/labs.ts
  platform/src/lib/file-tree-data.ts
  platform/src/components/HeroParticles.tsx
  platform/src/components/ThemeProvider.tsx
  platform/src/components/LandingSections.tsx
  platform/src/components/Navbar.tsx
  platform/src/components/SettingsModal.tsx
  platform/src/app/page.tsx
  platform/src/app/globals.css
  platform/src/app/login/page.tsx
```

---

## 完成标准

```
1. GET /api/files/:path 接口实现并注册
2. 路径穿越/注入防护全部通过
3. session 归属校验正确
4. 前端点击只读文件 → 显示内容
5. 前端点击可编辑文件 → 切回编辑模式
6. Monaco 编辑器只读/可编辑模式正确切换
7. 容器未运行时给出友好提示
8. npm run build 前后端无报错
9. 不破坏已有功能（认证、API Key、终端、提交）
```
