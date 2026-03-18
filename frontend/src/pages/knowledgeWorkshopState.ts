import type {
  KnowledgeDraftDTO,
  KnowledgeDiscussionMessageDTO,
  KnowledgeGeneratedPayloadDTO,
  KnowledgeSelectionDTO,
  KnowledgeWorkshopFilters,
  QuickCaptureRecordDTO,
} from "../utils/api";

export interface KnowledgeWorkshopNormalizedFilters {
  contentKind: "collected" | "generated";
  projectId: string | null;
  category: string | null;
}

export interface KnowledgeDiscussionContextInput {
  mode: "entry" | "selection";
  selectedEntryIds: string[];
  sourceEntryIds: string[];
  userPrompt: string;
  assistantReply: string;
  savedAt: string;
}

export interface KnowledgeGeneratedSaveInput {
  draft: KnowledgeDraftDTO;
  filters: KnowledgeWorkshopFilters;
  discussion: KnowledgeDiscussionContextInput;
}

export interface KnowledgeDiscussionStateLike {
  messages: KnowledgeDiscussionMessageDTO[];
  citations: Array<{ id: string; title: string }>;
  draft: KnowledgeDraftDTO | null;
  pendingAction: "create" | "append" | "keep_chat" | null;
  saveError: string | null;
  isSaving: boolean;
}

export interface KnowledgeWorkshopFacetOptions {
  projectIds: string[];
  categories: string[];
}

export interface KnowledgeWorkshopHistoryState {
  version: 1;
  filters: KnowledgeWorkshopNormalizedFilters;
  selectedEntryId: string | null;
  selectedEntryIds: string[];
  discussionMode: "entry" | "selection";
  searchQuery: string;
  messages: KnowledgeDiscussionMessageDTO[];
  citations: Array<{ id: string; title: string }>;
  draft: KnowledgeDraftDTO | null;
}

const normalizeText = (value: string | null | undefined): string | null => {
  const nextValue = typeof value === "string" ? value.trim() : "";
  return nextValue || null;
};

const excerpt = (value: string | null | undefined, limit = 120): string => {
  const text = normalizeText(value) ?? "";
  return text.length > limit ? text.slice(0, limit) : text;
};

const normalizeDiscussionMode = (
  value: string | null | undefined
): "entry" | "selection" => (value === "selection" ? "selection" : "entry");

const normalizeDiscussionMessages = (
  value: readonly KnowledgeDiscussionMessageDTO[] | null | undefined
): KnowledgeDiscussionMessageDTO[] => trimKnowledgeDiscussionHistory(value ?? []);

const normalizeKnowledgeDraft = (
  value: KnowledgeDraftDTO | null | undefined
): KnowledgeDraftDTO | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const contentMarkdown = normalizeText(value.content_markdown) ?? "";
  if (!contentMarkdown) {
    return null;
  }

  return {
    title: normalizeText(value.title) ?? "未命名生成笔记",
    content_markdown: contentMarkdown,
    tags: mergeKnowledgeSourceIds(value.tags),
    project_id: normalizeText(value.project_id),
    category: normalizeText(value.category),
  };
};

const normalizeKnowledgeCitations = (
  value: Array<{ id: string; title: string }> | null | undefined
) =>
  (Array.isArray(value) ? value : [])
    .map((item) => ({
      id: normalizeText(item?.id) ?? "",
      title: normalizeText(item?.title) ?? "",
    }))
    .filter((item) => item.id && item.title);

export const normalizeKnowledgeWorkshopFilters = (
  filters: KnowledgeWorkshopFilters = {}
): KnowledgeWorkshopNormalizedFilters => ({
  contentKind: filters.contentKind === "generated" ? "generated" : "collected",
  projectId: normalizeText(filters.projectId),
  category: normalizeText(filters.category),
});

export const getKnowledgeWorkshopListTitle = (
  contentKind: "collected" | "generated"
): "收集内容" | "生成内容" => (contentKind === "generated" ? "生成内容" : "收集内容");

export const trimKnowledgeDiscussionHistory = (
  history: readonly KnowledgeDiscussionMessageDTO[]
): KnowledgeDiscussionMessageDTO[] =>
  history
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    )
    .slice(-12);

export const mergeKnowledgeSourceIds = (
  ...sourceGroups: Array<readonly string[] | null | undefined>
): string[] => {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const group of sourceGroups) {
    if (!Array.isArray(group)) {
      continue;
    }

    for (const rawValue of group) {
      const value = normalizeText(rawValue);
      if (!value || seen.has(value)) {
        continue;
      }
      seen.add(value);
      merged.push(value);
    }
  }

  return merged;
};

export const collectKnowledgeWorkshopFacetOptions = (
  entries: ReadonlyArray<Pick<QuickCaptureRecordDTO, "project_id" | "category">>
): KnowledgeWorkshopFacetOptions => {
  const projectIds = mergeKnowledgeSourceIds(entries.map((entry) => entry.project_id ?? ""));
  const categories = mergeKnowledgeSourceIds(entries.map((entry) => entry.category ?? ""));

  return {
    projectIds: [...projectIds].sort((left, right) => left.localeCompare(right, "zh-CN")),
    categories: [...categories].sort((left, right) => left.localeCompare(right, "zh-CN")),
  };
};

export const getKnowledgeWorkshopHistoryStorageKey = (
  userId: string | null | undefined
) => {
  const normalizedUserId = normalizeText(userId);
  return normalizedUserId ? `vibelife_knowledge_workshop:${normalizedUserId}` : null;
};

export const serializeKnowledgeWorkshopState = (input: {
  filters: KnowledgeWorkshopFilters;
  selectedEntryId: string | null | undefined;
  selectedEntryIds: readonly string[];
  discussionMode: "entry" | "selection";
  searchQuery: string | null | undefined;
  messages: readonly KnowledgeDiscussionMessageDTO[];
  citations: Array<{ id: string; title: string }>;
  draft: KnowledgeDraftDTO | null;
}): KnowledgeWorkshopHistoryState => ({
  version: 1,
  filters: normalizeKnowledgeWorkshopFilters(input.filters),
  selectedEntryId: normalizeText(input.selectedEntryId),
  selectedEntryIds: mergeKnowledgeSourceIds(input.selectedEntryIds),
  discussionMode: normalizeDiscussionMode(input.discussionMode),
  searchQuery: normalizeText(input.searchQuery) ?? "",
  messages: normalizeDiscussionMessages(input.messages),
  citations: normalizeKnowledgeCitations(input.citations),
  draft: normalizeKnowledgeDraft(input.draft),
});

export const parseStoredKnowledgeWorkshopState = (
  raw: string | null
): KnowledgeWorkshopHistoryState => {
  const fallback: KnowledgeWorkshopHistoryState = {
    version: 1,
    filters: normalizeKnowledgeWorkshopFilters(),
    selectedEntryId: null,
    selectedEntryIds: [],
    discussionMode: "entry",
    searchQuery: "",
    messages: [],
    citations: [],
    draft: null,
  };

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<KnowledgeWorkshopHistoryState> | null;
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    return {
      version: 1,
      filters: normalizeKnowledgeWorkshopFilters(parsed.filters ?? {}),
      selectedEntryId: normalizeText(parsed.selectedEntryId),
      selectedEntryIds: mergeKnowledgeSourceIds(parsed.selectedEntryIds),
      discussionMode: normalizeDiscussionMode(parsed.discussionMode),
      searchQuery: normalizeText(parsed.searchQuery) ?? "",
      messages: normalizeDiscussionMessages(parsed.messages),
      citations: normalizeKnowledgeCitations(parsed.citations),
      draft: normalizeKnowledgeDraft(parsed.draft),
    };
  } catch {
    return fallback;
  }
};

export const createKnowledgeSelectionPayload = (
  filters: KnowledgeWorkshopFilters,
  selectedEntryIds: readonly string[]
): KnowledgeSelectionDTO => {
  const normalizedFilters = normalizeKnowledgeWorkshopFilters(filters);
  const normalizedEntryIds = mergeKnowledgeSourceIds(selectedEntryIds);

  return {
    content_kind: normalizedFilters.contentKind,
    project_id: normalizedFilters.projectId,
    category: normalizedFilters.category,
    selected_entry_ids: normalizedEntryIds,
  };
};

export const buildKnowledgeGeneratedSavePayload = (
  input: KnowledgeGeneratedSaveInput
): KnowledgeGeneratedPayloadDTO => {
  const normalizedFilters = normalizeKnowledgeWorkshopFilters(input.filters);
  const normalizedDraftTitle = normalizeText(input.draft.title) ?? "未命名生成笔记";
  const normalizedDraftContent = normalizeText(input.draft.content_markdown) ?? "";
  const normalizedDraftTags = mergeKnowledgeSourceIds(input.draft.tags);
  const normalizedSelectedEntryIds = mergeKnowledgeSourceIds(input.discussion.selectedEntryIds);
  const sourceCaptureIds = mergeKnowledgeSourceIds(
    input.discussion.sourceEntryIds,
    normalizedSelectedEntryIds
  );

  return {
    title: normalizedDraftTitle,
    content_markdown: normalizedDraftContent,
    tags: normalizedDraftTags,
    project_id:
      normalizeText(input.draft.project_id) ??
      normalizedFilters.projectId,
    category:
      normalizeText(input.draft.category) ??
      normalizedFilters.category,
    source_capture_ids: sourceCaptureIds,
    source_filter_snapshot:
      input.discussion.mode === "selection"
        ? {
            content_kind: normalizedFilters.contentKind,
            project_id: normalizedFilters.projectId,
            category: normalizedFilters.category,
            selected_entry_ids: normalizedSelectedEntryIds,
          }
        : null,
    discussion_metadata: {
      mode: input.discussion.mode,
      saved_at: input.discussion.savedAt,
      user_prompt_excerpt: excerpt(input.discussion.userPrompt),
      assistant_reply_excerpt: excerpt(input.discussion.assistantReply),
    },
  };
};

export const preserveKnowledgeDiscussionStateOnSaveFailure = <T extends KnowledgeDiscussionStateLike>(
  state: T,
  saveError: string
): T => ({
  ...state,
  isSaving: false,
  saveError,
});
