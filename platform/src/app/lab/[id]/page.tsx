import { promises as fs } from "node:fs";
import path from "node:path";

import LabSidebar from "@/components/LabSidebar";
import LabWorkspace from "@/components/LabWorkspace";
import { LABS } from "@/lib/labs";

type LabPageProps = {
  params: Promise<{ id: string }>;
};

async function readLabMarkdown(labId: number): Promise<string> {
  const filePath = path.resolve(
    process.cwd(),
    "..",
    "docs",
    "labs",
    `lab-${String(labId).padStart(2, "0")}`,
    "index.md",
  );

  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return `# Lab ${labId}\n\n文档暂未准备好，后续会在这里渲染对应的知识讲解。`;
  }
}

export default async function LabPage({ params }: LabPageProps) {
  const { id } = await params;
  const labId = Number(id);
  const lab = LABS.find((item) => item.id === labId) ?? LABS[0];
  const content = await readLabMarkdown(lab.id);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[var(--bg-page)]">
      <LabSidebar labId={lab.id} content={content} />
      <LabWorkspace key={lab.id} lab={lab} />
    </div>
  );
}
