import { promises as fs } from "node:fs";
import path from "node:path";

import PlatformPageClient from "@/components/PlatformPageClient";
import ScrollReactiveOrbs from "@/components/ScrollReactiveOrbs";
import FloatingCodeBlocks from "@/components/FloatingCodeBlocks";

export const metadata = {
  title: "BYOCC — 选择 Lab",
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
    return "";
  }
}

export default async function PlatformPage() {
  const labContents: Record<number, string> = {};
  for (let i = 0; i <= 5; i++) {
    labContents[i] = await readLabMarkdown(i);
  }

  return (
    <div className="grid-pattern relative flex min-h-[calc(100vh-56px)] flex-col bg-[var(--bg-page)]">
      <FloatingCodeBlocks />
      <ScrollReactiveOrbs />
      <PlatformPageClient labContents={labContents} />
    </div>
  );
}
