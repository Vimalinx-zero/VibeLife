export const getNotesPreviewCopy = (
  selectionType: "file" | "folder",
  itemCount: number
) => {
  if (selectionType === "file") {
    return {
      chipLabel: "只读",
      helperText: "当前只在这里预览内容",
    };
  }

  return {
    chipLabel: "目录范围",
    helperText: `${itemCount} 个文件会进入当前对话范围`,
  };
};

export const getNotesExplorerCopy = () => ({
  createFolderTitle: "新建文件夹",
  createNoteTitle: "新建笔记",
  upLevelLabel: "返回上一级",
  emptyLabel: "这里还没有内容",
  settingsLabel: "设置",
});

export const getNotesStudioCopy = () => ({
  generatedLabel: "成果",
  headerCaption: "对话沉淀",
});

export const getNotesDisplayName = (name: string) => {
  if (name === "Library") {
    return "资料库";
  }

  return name;
};
