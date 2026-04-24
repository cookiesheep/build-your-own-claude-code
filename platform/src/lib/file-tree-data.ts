import labFilesConfig from "./lab-files.json";

export interface FileTreeNode {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: FileTreeNode[];
}

export interface LabFileDef {
  path: string;
  editable: boolean;
  skeleton: string;
}

export const LAB_FILES = Object.fromEntries(
  Object.entries(labFilesConfig).map(([labNumber, files]) => [
    Number(labNumber),
    files as LabFileDef[],
  ])
) as Record<number, LabFileDef[]>;

export const LAB_EDITABLE_FILES: Record<number, string[]> = Object.fromEntries(
  Object.entries(LAB_FILES).map(([id, files]) => [
    Number(id),
    files.filter((file) => file.editable).map((file) => file.path),
  ])
);

export function getLabInitialFiles(labId: number): Record<string, string> {
  return Object.fromEntries((LAB_FILES[labId] ?? []).map((file) => [file.path, file.skeleton]));
}

export function getPrimaryEditableLabFile(labId: number): string | null {
  return LAB_EDITABLE_FILES[labId]?.[0] ?? null;
}

export function buildTreeFromPaths(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const path of paths) {
    const parts = path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i += 1) {
      const name = parts[i];
      const nodePath = parts.slice(0, i + 1).join('/');
      const isFile = i === parts.length - 1;
      const existing = current.find((node) => node.name === name);

      if (existing) {
        if (!isFile) {
          current = existing.children ?? [];
        }
        continue;
      }

      const node: FileTreeNode = isFile
        ? { name, type: "file", path: nodePath }
        : { name, type: "directory", path: nodePath, children: [] };

      current.push(node);
      if (!isFile) {
        current = node.children ?? [];
      }
    }
  }

  function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
    return nodes
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
      .map((node) =>
        node.children
          ? { ...node, children: sortNodes(node.children) }
          : node
      );
  }

  return sortNodes(root);
}

export function buildLabFileTree(labId: number): FileTreeNode[] {
  return buildTreeFromPaths((LAB_FILES[labId] ?? []).map((file) => file.path));
}
