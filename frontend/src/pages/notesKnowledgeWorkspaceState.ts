export interface NotesKnowledgeNodeLike {
  id: string;
  type: "file" | "folder";
  name: string;
  content?: string | null;
}

export interface NotesKnowledgeContextInput {
  selectedNode: NotesKnowledgeNodeLike | null;
  visibleItems: ReadonlyArray<Pick<NotesKnowledgeNodeLike, "id" | "type" | "name">>;
}

export interface NotesKnowledgeContext {
  mode: "entry" | "selection";
  selectedEntryId: string | null;
  selectedEntryIds: string[];
}

export interface NotesPreviewDocument {
  title: string;
  content: string;
  empty: boolean;
}

const normalizeText = (value: string | null | undefined) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text;
};

export const buildNotesKnowledgeContext = ({
  selectedNode,
  visibleItems,
}: NotesKnowledgeContextInput): NotesKnowledgeContext => {
  if (selectedNode?.type === "file") {
    return {
      mode: "entry",
      selectedEntryId: selectedNode.id,
      selectedEntryIds: [selectedNode.id],
    };
  }

  return {
    mode: "selection",
    selectedEntryId: null,
    selectedEntryIds: visibleItems
      .filter((item) => item.type === "file")
      .map((item) => item.id),
  };
};

export const buildNotesPreviewDocument = ({
  selectedNode,
}: {
  selectedNode: NotesKnowledgeNodeLike | null;
}): NotesPreviewDocument => {
  const title = selectedNode?.name ?? "未选择笔记";
  const content =
    selectedNode?.type === "file" ? normalizeText(selectedNode.content) : "";

  return {
    title,
    content,
    empty: content.length === 0,
  };
};
