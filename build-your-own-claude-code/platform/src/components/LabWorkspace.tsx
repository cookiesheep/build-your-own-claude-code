"use client";

import type { LabMeta } from "@/lib/labs";
import LabRightArea from "./LabRightArea";

type LabWorkspaceProps = {
  lab: LabMeta;
};

export default function LabWorkspace({ lab }: LabWorkspaceProps) {
  return <LabRightArea lab={lab} onToggleDocs={() => {}} docsCollapsed={false} />;
}
