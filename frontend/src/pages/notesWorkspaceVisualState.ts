export interface NotesWorkspaceVisualProfile {
  pageShellClassName: string;
  headerClassName: string;
  gridClassName: string;
  searchTone: "default" | "quiet-dark";
  leftTone: "quiet" | "balanced";
  centerTone: "hero" | "balanced";
  rightTone: "quiet" | "balanced";
  pageAccentLabel: string;
}

export const getNotesWorkspaceVisualProfile = (
  variant: "focus-chat" = "focus-chat"
): NotesWorkspaceVisualProfile => {
  if (variant === "focus-chat") {
    return {
      pageShellClassName:
        "relative isolate overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(244,240,228,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(111,133,156,0.14),transparent_22%),linear-gradient(180deg,#151c24_0%,#0d131a_58%,#090d12_100%)]",
      headerClassName:
        "rounded-[28px] border border-white/[0.1] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-5 py-5 shadow-[0_24px_72px_rgba(15,23,42,0.22)] backdrop-blur-[20px]",
      gridClassName: "xl:grid-cols-[minmax(340px,24rem)_minmax(0,1.48fr)_minmax(320px,24rem)]",
      searchTone: "quiet-dark",
      leftTone: "quiet",
      centerTone: "hero",
      rightTone: "quiet",
      pageAccentLabel: "Conversation First",
    };
  }

  return {
    pageShellClassName:
      "relative isolate overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(244,240,228,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(111,133,156,0.14),transparent_22%),linear-gradient(180deg,#151c24_0%,#0d131a_58%,#090d12_100%)]",
    headerClassName:
      "rounded-[28px] border border-white/[0.1] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-5 py-5 shadow-[0_24px_72px_rgba(15,23,42,0.22)] backdrop-blur-[20px]",
    gridClassName: "xl:grid-cols-[minmax(340px,24rem)_minmax(0,1.48fr)_minmax(320px,24rem)]",
    searchTone: "quiet-dark",
    leftTone: "quiet",
    centerTone: "hero",
    rightTone: "quiet",
    pageAccentLabel: "Conversation First",
  };
};
