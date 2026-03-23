export type KnowledgeImportPanelMode =
  | "expanded"
  | "compact-clean"
  | "compact-dirty";

export type KnowledgeCenterPanelState = "empty" | "focus";

export type KnowledgeStudioSection = "draft" | "outputs" | "citations";

export const getKnowledgeImportPanelMode = (input: {
  expanded: boolean;
  hasPendingTitle: boolean;
  hasPendingSource: boolean;
  hasPendingTags: boolean;
  hasPendingFile: boolean;
}): KnowledgeImportPanelMode => {
  if (input.expanded) {
    return "expanded";
  }

  const isDirty =
    input.hasPendingTitle ||
    input.hasPendingSource ||
    input.hasPendingTags ||
    input.hasPendingFile;

  return isDirty ? "compact-dirty" : "compact-clean";
};

export const getKnowledgeImportPanelSummary = (input: {
  expanded: boolean;
  hasPendingTitle: boolean;
  hasPendingSource: boolean;
  hasPendingTags: boolean;
  hasPendingFile: boolean;
}): string => {
  const mode = getKnowledgeImportPanelMode(input);

  if (mode === "expanded") {
    return "正在编辑导入来源";
  }

  const pendingCount = [
    input.hasPendingTitle,
    input.hasPendingSource,
    input.hasPendingTags,
    input.hasPendingFile,
  ].filter(Boolean).length;

  if (pendingCount === 0) {
    return "支持文本、链接和文件导入";
  }

  return `已暂存 ${pendingCount} 项导入信息`;
};

export const getKnowledgeCenterPanelState = (input: {
  selectedEntryId: string | null;
  messageCount: number;
}): KnowledgeCenterPanelState =>
  input.selectedEntryId || input.messageCount > 0 ? "focus" : "empty";

export const getKnowledgeStudioSections = (input: {
  hasDraft: boolean;
  generatedCount: number;
  citationCount: number;
}): KnowledgeStudioSection[] => {
  const sections: KnowledgeStudioSection[] = [];

  if (input.hasDraft) {
    sections.push("draft");
  }

  sections.push("outputs");

  if (input.citationCount > 0) {
    sections.push("citations");
  }

  return sections;
};
