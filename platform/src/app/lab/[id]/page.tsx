import { promises as fs } from "node:fs";
import path from "node:path";

import LabLayout from "@/components/LabLayout";
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
    <div style={{ marginTop: 56 }}>
      <LabLayout lab={lab} content={content} />
    </div>
  );
}
