export type NotesUtilityPanel = "links" | "tags" | null;

const normalizeTag = (value: string | null | undefined) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
};

export const getCompactNoteTags = (
  tags: readonly string[] | null | undefined,
  maxVisible = 2
) => {
  const normalizedTags: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of tags ?? []) {
    const tag = normalizeTag(rawTag);
    if (!tag || seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    normalizedTags.push(tag);
  }

  const visibleCount = Math.max(0, Math.floor(maxVisible));
  return {
    visibleTags: normalizedTags.slice(0, visibleCount),
    overflowCount: Math.max(0, normalizedTags.length - visibleCount),
  };
};

export const shouldCollapseNoteHeader = (
  scrollTop: number,
  threshold = 32
) => scrollTop >= threshold;

export const getNextNotesUtilityPanel = (
  currentPanel: NotesUtilityPanel,
  requestedPanel: Exclude<NotesUtilityPanel, null>
): NotesUtilityPanel =>
  currentPanel === requestedPanel ? null : requestedPanel;
