/**
 * Docker 容器管理服务
 *
 * 职责：创建、管理、销毁学习者的 Lab 容器
 * 每个学习者会话对应一个独立的 Docker 容器，容器内有：
 *   - Node.js 18 运行环境
 *   - claude-code-diy 预克隆代码
 *   - ttyd 终端服务（端口 7681）
 *
 * TODO: 以下方法需要你来实现！
 *       每个方法都有详细注释说明输入输出和实现思路。
 */

import Docker from 'dockerode';

// 自动连接到本地 Docker（Docker Desktop 必须在运行）
const docker = new Docker();

// Lab 容器使用的镜像名称
const LAB_IMAGE = 'byocc-lab';

// 存储 sessionId → containerId 的映射
const sessionContainers = new Map<string, string>();

/**
 * 为学习者会话创建一个新的 Docker 容器
 *
 * @param sessionId - 学习者的会话 ID（例如 "user-abc123"）
 * @returns containerId - Docker 容器 ID
 *
 * 实现思路：
 *   1. 调用 docker.createContainer() 创建容器
 *   2. 设置镜像为 LAB_IMAGE
 *   3. 端口映射：容器 7681 → 主机随机端口
 *   4. 资源限制：512MB 内存，50% CPU
 *   5. 启动容器
 *   6. 记录到 sessionContainers Map
 *   7. 返回容器 ID
 */
export async function createContainer(sessionId: string): Promise<string> {
  // TODO: 实现容器创建逻辑
  // 提示：使用 docker.createContainer({
  //   Image: LAB_IMAGE,
  //   name: `lab-${sessionId}`,
  //   ExposedPorts: { '7681/tcp': {} },
  //   HostConfig: {
  //     PortBindings: { '7681/tcp': [{ HostPort: '0' }] },  // 随机端口
  //     Memory: 512 * 1024 * 1024,
  //     CpuPeriod: 100000,
  //     CpuQuota: 50000,
  //   },
  // })
  throw new Error('TODO: 实现 createContainer');
}

/**
 * 将学习者的代码注入到容器内
 *
 * @param sessionId - 会话 ID
 * @param code - 学习者编写的 TypeScript 代码（字符串）
 * @param labNumber - Lab 编号（0-6）
 *
 * 实现思路：
 *   1. 根据 sessionId 找到容器 ID
 *   2. 用 container.exec() 在容器内执行命令
 *   3. 将 code 写入容器的 /workspace/src/query-lab.ts
 *   4. 注意：code 可能包含特殊字符，建议用 base64 编码传输
 */
export async function injectCode(
  sessionId: string,
  code: string,
  labNumber: number
): Promise<void> {
  // TODO: 实现代码注入逻辑
  throw new Error('TODO: 实现 injectCode');
}

/**
 * 在容器内触发构建
 *
 * @param sessionId - 会话 ID
 * @param labNumber - Lab 编号
 * @returns 构建日志（stdout + stderr）
 *
 * 实现思路：
 *   1. 在容器内执行 `node build.mjs --lab`
 *   2. 收集 stdout 和 stderr
 *   3. 返回构建日志
 */
export async function buildInContainer(
  sessionId: string,
  labNumber: number
): Promise<{ success: boolean; log: string }> {
  // TODO: 实现容器内构建逻辑
  throw new Error('TODO: 实现 buildInContainer');
}

/**
 * 获取容器 ttyd 的主机端口
 *
 * @param sessionId - 会话 ID
 * @returns ttyd 映射到主机的端口号
 *
 * 实现思路：
 *   1. 找到容器
 *   2. container.inspect() 获取端口映射
 *   3. 返回 7681 映射的主机端口
 */
export async function getTtydPort(sessionId: string): Promise<number> {
  // TODO: 实现获取 ttyd 端口逻辑
  throw new Error('TODO: 实现 getTtydPort');
}

/**
 * 停止并删除容器
 */
export async function removeContainer(sessionId: string): Promise<void> {
  // TODO: 实现容器删除逻辑
  throw new Error('TODO: 实现 removeContainer');
}

/**
 * 获取容器状态
 */
export async function getContainerStatus(
  sessionId: string
): Promise<'running' | 'stopped' | 'not_found'> {
  // TODO: 实现容器状态查询
  throw new Error('TODO: 实现 getContainerStatus');
}
