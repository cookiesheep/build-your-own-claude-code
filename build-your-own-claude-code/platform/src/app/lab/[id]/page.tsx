import { promises as fs } from "node:fs";
import path from "node:path";

import ApiKeyGate from "@/components/ApiKeyGate";
import AuthGuard from "@/components/AuthGuard";
import LabLayout from "@/components/LabLayout";
import { LABS } from "@/lib/labs";

type LabPageProps = {
  params: Promise<{ id: string }>;
};

async function readLabMarkdown(
  labId: number,
  filename: string,
): Promise<string> {
  const filePath = path.resolve(
    process.cwd(),
    "..",
    "docs",
    "labs",
    `lab-${String(labId).padStart(2, "0")}`,
    filename,
  );

  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

export default async function LabPage({ params }: LabPageProps) {
  const { id } = await params;
  const labId = Number(id);
  const lab = LABS.find((item) => item.id === labId) ?? LABS[0];
  const indexContent = await readLabMarkdown(lab.id, "index.md");
  const tasksContent = await readLabMarkdown(lab.id, "tasks.md");

  return (
    <AuthGuard>
      <ApiKeyGate labId={lab.id}>
        <div style={{ marginTop: 56 }}>
          <LabLayout lab={lab} indexContent={indexContent || `# Lab ${lab.id}\n\n文档暂未准备好。`} tasksContent={tasksContent} />
        </div>
      </ApiKeyGate>
    </AuthGuard>
  );
}
