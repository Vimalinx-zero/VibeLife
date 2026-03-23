export const getNotesLeftPaneState = ({
  hasActiveFile,
}: {
  hasActiveFile: boolean;
}) => {
  if (hasActiveFile) {
    return {
      containerClassName: "flex h-full min-h-0 flex-col",
      mode: "preview" as const,
      previewPanelClassName: "h-full",
      showBackButton: true,
      showExplorer: false,
      showPreview: true,
    };
  }

  return {
    containerClassName: "flex h-full min-h-0 flex-col",
    mode: "explorer" as const,
    previewPanelClassName: "",
    showBackButton: false,
    showExplorer: true,
    showPreview: false,
  };
};

export const getNotesChatChromeState = () => ({
  showTitleHeader: false,
  showLocationMeta: true,
});

export const getNotesWorkspaceGridClassName = ({
  hasActiveFile,
  rightPaneCollapsed,
}: {
  hasActiveFile: boolean;
  rightPaneCollapsed: boolean;
}) => {
  if (rightPaneCollapsed) {
    return hasActiveFile
      ? "xl:grid-cols-[minmax(425px,30rem)_minmax(0,1.46fr)_4.5rem]"
      : "xl:grid-cols-[minmax(340px,24rem)_minmax(0,1.58fr)_4.5rem]";
  }

  return hasActiveFile
    ? "xl:grid-cols-[minmax(425px,30rem)_minmax(0,1.36fr)_minmax(320px,24rem)]"
    : "xl:grid-cols-[minmax(340px,24rem)_minmax(0,1.48fr)_minmax(320px,24rem)]";
};

export const getNotesRightPaneState = ({
  collapsed,
}: {
  collapsed: boolean;
}) => {
  if (collapsed) {
    return {
      actionLabel: "展开右栏",
      railClassName:
        "flex h-full min-h-0 w-full flex-col items-center justify-start rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(19,24,30,0.84),rgba(12,16,22,0.8))] px-2 py-4 text-slate-200 shadow-[0_28px_72px_rgba(15,23,42,0.24)] backdrop-blur-[22px]",
      showCollapsedRail: true,
      showPanel: false,
    };
  }

  return {
    actionLabel: "收起右栏",
    railClassName: "hidden",
    showCollapsedRail: false,
    showPanel: true,
  };
};
