import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import KnowledgeBrowser from "../components/knowledge/KnowledgeBrowser";
import KnowledgeDiscussionPanel, {
  type KnowledgeCitationLike,
} from "../components/knowledge/KnowledgeDiscussionPanel";
import KnowledgeSidebar, {
  type KnowledgeImportDraft,
  type KnowledgeSidebarProjectOption,
} from "../components/knowledge/KnowledgeSidebar";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  knowledgeWorkshopAPI,
  projectsAPI,
  quickCaptureAPI,
  type KnowledgeDraftDTO,
  type KnowledgeDiscussionMessageDTO,
  type ProjectRecordDTO,
  type QuickCaptureRecordDTO,
} from "../utils/api";
import {
  buildKnowledgeCitationNavigationState,
  buildKnowledgeGeneratedEntryNavigationState,
  buildKnowledgeGeneratedSavePayload,
  collectKnowledgeWorkshopFacetOptions,
  createKnowledgeSelectionPayload,
  getKnowledgeWorkshopHistoryStorageKey,
  getKnowledgeWorkshopListTitle,
  mergeKnowledgeSourceIds,
  normalizeKnowledgeWorkshopFilters,
  parseStoredKnowledgeWorkshopState,
  preserveKnowledgeDiscussionStateOnSaveFailure,
  serializeKnowledgeWorkshopState,
  trimKnowledgeDiscussionHistory,
  type KnowledgeDiscussionStateLike,
  type KnowledgeWorkshopNormalizedFilters,
} from "./knowledgeWorkshopState";

interface KnowledgeSearchResult {
  id: string;
  score: number;
  title: string;
  summary: string;
  tags: string[];
  source_type: string;
  project_id: string | null;
  content_kind?: "collected" | "generated";
  category?: string | null;
}

interface KnowledgeDiscussionUiState extends KnowledgeDiscussionStateLike {
  citations: KnowledgeCitationLike[];
  draft: KnowledgeDraftDTO | null;
}

const pagePanelClassName =
  "inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300";

const createEmptyImportDraft = (): KnowledgeImportDraft => ({
  mode: "text",
  title: "",
  projectId: "",
  category: "",
  tags: [],
  textContent: "",
  url: "",
  file: null,
  fileSourceType: "txt",
});

const createInitialDiscussionState = (): KnowledgeDiscussionUiState => ({
  messages: [],
  citations: [],
  draft: null,
  pendingAction: null,
  saveError: null,
  isSaving: false,
});

const inferUploadSourceType = (file: File | null): string => {
  if (!file) {
    return "txt";
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (extension === "pdf") {
    return "pdf";
  }
  if (["doc", "docx"].includes(extension)) {
    return "doc";
  }
  if (["md", "markdown"].includes(extension)) {
    return "md";
  }
  if (["txt", "text"].includes(extension)) {
    return "txt";
  }
  return "txt";
};

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "detail" in error.response.data &&
    typeof error.response.data.detail === "string"
  ) {
    return error.response.data.detail;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

const createFallbackEntryFromSearchResult = (
  result: KnowledgeSearchResult
): QuickCaptureRecordDTO => ({
  id: result.id,
  title: result.title,
  source_type: result.source_type,
  source_uri: "",
  summary: result.summary,
  tags: result.tags ?? [],
  project_id: result.project_id ?? null,
  created_at: "",
  updated_at: "",
  content_kind: result.content_kind ?? "collected",
  category: result.category ?? null,
  normalized_markdown: result.summary,
  source_capture_ids: [],
  source_filter_snapshot: null,
  discussion_metadata: null,
});

const hasSameIds = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const QuickCapturePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const historyStorageKey = getKnowledgeWorkshopHistoryStorageKey(user?.id);

  const [filters, setFilters] = useState<KnowledgeWorkshopNormalizedFilters>(() =>
    normalizeKnowledgeWorkshopFilters()
  );
  const [importDraft, setImportDraft] = useState<KnowledgeImportDraft>(() =>
    createEmptyImportDraft()
  );
  const [entries, setEntries] = useState<QuickCaptureRecordDTO[]>([]);
  const [generatedEntries, setGeneratedEntries] = useState<QuickCaptureRecordDTO[]>([]);
  const [projects, setProjects] = useState<ProjectRecordDTO[]>([]);
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [discussionMode, setDiscussionMode] = useState<"entry" | "selection">("entry");
  const [discussionState, setDiscussionState] = useState<KnowledgeDiscussionUiState>(() =>
    createInitialDiscussionState()
  );
  const [discussionInput, setDiscussionInput] = useState("");
  const [appendTargetId, setAppendTargetId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [listReloadKey, setListReloadKey] = useState(0);
  const [generatedReloadKey, setGeneratedReloadKey] = useState(0);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        const nextProjects = await projectsAPI.getProjects();
        if (!cancelled) {
          setProjects(nextProjects);
        }
      } catch (error) {
        console.error("Failed to load project options:", error);
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!historyStorageKey) {
      setFilters(normalizeKnowledgeWorkshopFilters());
      setSelectedEntryId(null);
      setSelectedEntryIds([]);
      setDiscussionMode("entry");
      setDiscussionState(createInitialDiscussionState());
      setSearchInput("");
      setActiveSearchQuery("");
      setHasLoadedHistory(false);
      return;
    }

    const stored = parseStoredKnowledgeWorkshopState(
      localStorage.getItem(historyStorageKey)
    );

    setFilters(stored.filters);
    setSelectedEntryId(stored.selectedEntryId);
    setSelectedEntryIds(stored.selectedEntryIds);
    setDiscussionMode(stored.discussionMode);
    setDiscussionState({
      ...createInitialDiscussionState(),
      messages: stored.messages,
      citations: stored.citations,
      draft: stored.draft,
    });
    setSearchInput(stored.searchQuery);
    setActiveSearchQuery(stored.searchQuery);
    setHasLoadedHistory(true);
  }, [historyStorageKey]);

  useEffect(() => {
    if (!historyStorageKey || !hasLoadedHistory) {
      return;
    }

    localStorage.setItem(
      historyStorageKey,
      JSON.stringify(
        serializeKnowledgeWorkshopState({
          filters,
          selectedEntryId,
          selectedEntryIds,
          discussionMode,
          searchQuery: activeSearchQuery,
          messages: discussionState.messages,
          citations: discussionState.citations,
          draft: discussionState.draft,
        })
      )
    );
  }, [
    activeSearchQuery,
    discussionMode,
    discussionState.citations,
    discussionState.draft,
    discussionState.messages,
    filters,
    hasLoadedHistory,
    historyStorageKey,
    selectedEntryId,
    selectedEntryIds,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadEntries = async () => {
      setIsLoadingEntries(true);
      setLoadError(null);

      try {
        const nextEntries = await knowledgeWorkshopAPI.listEntries(filters);
        if (cancelled) {
          return;
        }
        setEntries(nextEntries);

        if (activeSearchQuery.trim()) {
          const nextSearchResults = await knowledgeWorkshopAPI.searchEntries(
            activeSearchQuery.trim(),
            filters
          );
          if (cancelled) {
            return;
          }
          setSearchResults(nextSearchResults);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to load workshop entries:", error);
        setLoadError(getErrorMessage(error, "加载知识库内容失败"));
      } finally {
        if (!cancelled) {
          setIsLoadingEntries(false);
        }
      }
    };

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, [
    activeSearchQuery,
    filters,
    listReloadKey,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadGeneratedEntries = async () => {
      try {
        const nextGeneratedEntries = await knowledgeWorkshopAPI.listEntries({
          contentKind: "generated",
        });
        if (!cancelled) {
          setGeneratedEntries(nextGeneratedEntries);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load generated knowledge entries:", error);
        }
      }
    };

    void loadGeneratedEntries();

    return () => {
      cancelled = true;
    };
  }, [generatedReloadKey]);

  const projectNameById = useMemo(
    () =>
      Object.fromEntries(
        projects.map((project) => [project.id, project.name || project.id])
      ),
    [projects]
  );

  const facetOptions = useMemo(
    () => collectKnowledgeWorkshopFacetOptions(entries),
    [entries]
  );

  const projectOptions = useMemo<KnowledgeSidebarProjectOption[]>(() => {
    const ids = mergeKnowledgeSourceIds(
      projects.map((project) => project.id),
      facetOptions.projectIds,
      [
        filters.projectId ?? "",
        importDraft.projectId,
        discussionState.draft?.project_id ?? "",
      ]
    );

    return ids.map((id) => ({
      id,
      name: projectNameById[id] ?? id,
    }));
  }, [
    discussionState.draft?.project_id,
    facetOptions.projectIds,
    filters.projectId,
    importDraft.projectId,
    projectNameById,
    projects,
  ]);

  const categoryOptions = useMemo(
    () =>
      mergeKnowledgeSourceIds(facetOptions.categories, [
        filters.category ?? "",
        importDraft.category,
        discussionState.draft?.category ?? "",
      ]),
    [
      discussionState.draft?.category,
      facetOptions.categories,
      filters.category,
      importDraft.category,
    ]
  );

  const entriesById = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries]
  );

  const visibleEntries = useMemo(() => {
    if (!activeSearchQuery.trim()) {
      return entries;
    }

    return searchResults.map((result) =>
      entriesById.get(result.id) ?? createFallbackEntryFromSearchResult(result)
    );
  }, [activeSearchQuery, entries, entriesById, searchResults]);

  const selectedEntry = useMemo(
    () =>
      visibleEntries.find((entry) => entry.id === selectedEntryId) ??
      entries.find((entry) => entry.id === selectedEntryId) ??
      null,
    [entries, selectedEntryId, visibleEntries]
  );

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedEntryIds.includes(entry.id)),
    [entries, selectedEntryIds]
  );

  useEffect(() => {
    const allIds = new Set(entries.map((entry) => entry.id));
    const visibleIds = visibleEntries.map((entry) => entry.id);
    const visibleIdSet = new Set(visibleIds);

    setSelectedEntryIds((current) => {
      const next = current.filter((id) => allIds.has(id));
      return hasSameIds(current, next) ? current : next;
    });

    setSelectedEntryId((current) => {
      if (current && visibleIdSet.has(current)) {
        return current;
      }
      return visibleIds[0] ?? null;
    });
  }, [entries, visibleEntries]);

  useEffect(() => {
    setAppendTargetId((current) => {
      const currentStillValid =
        current && generatedEntries.some((entry) => entry.id === current);
      if (currentStillValid) {
        return current;
      }

      if (
        selectedEntry?.content_kind === "generated" &&
        generatedEntries.some((entry) => entry.id === selectedEntry.id)
      ) {
        return selectedEntry.id;
      }

      return generatedEntries[0]?.id ?? null;
    });
  }, [generatedEntries, selectedEntry]);

  const updateFilters = (patch: Partial<KnowledgeWorkshopNormalizedFilters>) => {
    setFilters((current) =>
      normalizeKnowledgeWorkshopFilters({
        contentKind: patch.contentKind ?? current.contentKind,
        projectId:
          patch.projectId !== undefined ? patch.projectId : current.projectId,
        category: patch.category !== undefined ? patch.category : current.category,
      })
    );
  };

  const handleApplySearch = () => {
    setActiveSearchQuery(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveSearchQuery("");
  };

  const applyNavigationState = ({
    filters: nextFilters,
    selectedEntryId: nextSelectedEntryId,
    selectedEntryIds: nextSelectedEntryIds,
    discussionMode: nextDiscussionMode,
    searchQuery,
  }: {
    filters: KnowledgeWorkshopNormalizedFilters;
    selectedEntryId: string | null;
    selectedEntryIds: string[];
    discussionMode: "entry";
    searchQuery: string;
  }) => {
    setFilters(nextFilters);
    setSelectedEntryId(nextSelectedEntryId);
    setSelectedEntryIds(nextSelectedEntryIds);
    setDiscussionMode(nextDiscussionMode);
    setSearchInput(searchQuery);
    setActiveSearchQuery(searchQuery);
  };

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryId(entryId);
  };

  const handleToggleEntrySelection = (entryId: string) => {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId]
    );
    setSelectedEntryId(entryId);
  };

  const handleSelectCitation = (citationId: string) => {
    const citation = discussionState.citations.find((item) => item.id === citationId);
    if (!citation) {
      return;
    }

    applyNavigationState(buildKnowledgeCitationNavigationState(citation));
  };

  const handleImportSubmit = async () => {
    const title = importDraft.title.trim();
    const projectId = importDraft.projectId.trim();
    const category = importDraft.category.trim();

    setImportError(null);
    setIsImporting(true);

    try {
      let createdEntry: QuickCaptureRecordDTO;

      if (importDraft.mode === "text") {
        const content = importDraft.textContent.trim();
        if (!content) {
          throw new Error("请输入要导入的文本内容");
        }

        createdEntry = await quickCaptureAPI.capture({
          source_type: "text",
          source_uri: content,
          title: title || undefined,
          project_id: projectId || undefined,
          category: category || undefined,
          tags: importDraft.tags,
        });
      } else if (importDraft.mode === "url") {
        const url = importDraft.url.trim();
        if (!url) {
          throw new Error("请输入要导入的链接");
        }

        createdEntry = await quickCaptureAPI.capture({
          source_type: "url",
          source_uri: url,
          title: title || undefined,
          project_id: projectId || undefined,
          category: category || undefined,
          tags: importDraft.tags,
        });
      } else {
        const file = importDraft.file;
        if (!file) {
          throw new Error("请先选择一个文件");
        }

        createdEntry = await knowledgeWorkshopAPI.uploadEntry({
          file,
          sourceType: importDraft.fileSourceType || inferUploadSourceType(file),
          title: title || undefined,
          projectId: projectId || null,
          category: category || null,
          tags: importDraft.tags,
        });
      }

      setImportDraft((current) => ({
        ...createEmptyImportDraft(),
        mode: current.mode,
        projectId: current.projectId,
        category: current.category,
        fileSourceType: current.fileSourceType,
      }));
      setListReloadKey((value) => value + 1);
      toast.success(`已导入：${createdEntry.title}`);

      const matchesCurrentFilter =
        filters.contentKind === (createdEntry.content_kind ?? "collected") &&
        (!filters.projectId || filters.projectId === createdEntry.project_id) &&
        (!filters.category || filters.category === createdEntry.category);

      if (matchesCurrentFilter) {
        setSelectedEntryId(createdEntry.id);
      }
    } catch (error) {
      const message = getErrorMessage(error, "导入失败");
      setImportError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSendDiscussion = async () => {
    const question = discussionInput.trim();
    if (!question || isDiscussing) {
      return;
    }

    if (discussionMode === "entry" && !selectedEntry) {
      toast.error("请先选中一条知识内容，再开始单条讨论");
      return;
    }

    const nextUserMessage: KnowledgeDiscussionMessageDTO = {
      role: "user",
      content: question,
    };
    const nextHistory = trimKnowledgeDiscussionHistory([
      ...discussionState.messages,
      nextUserMessage,
    ]);

    setDiscussionState((current) => ({
      ...current,
      messages: nextHistory,
      saveError: null,
      pendingAction: null,
    }));
    setDiscussionInput("");
    setIsDiscussing(true);

    try {
      const response = await knowledgeWorkshopAPI.discuss({
        mode: discussionMode,
        message: question,
        history: nextHistory,
        entry_id: discussionMode === "entry" ? selectedEntry?.id : undefined,
        selection:
          discussionMode === "selection"
            ? createKnowledgeSelectionPayload(filters, selectedEntryIds)
            : undefined,
      });

      const nextAssistantMessage: KnowledgeDiscussionMessageDTO = {
        role: "assistant",
        content: response.reply,
      };

      setDiscussionState((current) => ({
        ...current,
        messages: trimKnowledgeDiscussionHistory([
          ...nextHistory,
          nextAssistantMessage,
        ]),
        citations: response.citations ?? [],
        draft: response.draft,
        saveError: null,
        pendingAction: null,
      }));
      toast.success("知识讨论已更新");
    } catch (error) {
      const message = getErrorMessage(error, "知识讨论失败");
      const errorReply: KnowledgeDiscussionMessageDTO = {
        role: "assistant",
        content: `抱歉，这次知识讨论没有成功：${message}`,
      };
      setDiscussionState((current) => ({
        ...current,
        messages: trimKnowledgeDiscussionHistory([
          ...nextHistory,
          errorReply,
        ]),
      }));
      toast.error(message);
    } finally {
      setIsDiscussing(false);
    }
  };

  const buildSavePayload = () => {
    if (!discussionState.draft) {
      return null;
    }

    const latestUserPrompt =
      [...discussionState.messages]
        .reverse()
        .find((message) => message.role === "user")?.content ?? "";
    const latestAssistantReply =
      [...discussionState.messages]
        .reverse()
        .find((message) => message.role === "assistant")?.content ?? "";

    return buildKnowledgeGeneratedSavePayload({
      draft: discussionState.draft,
      filters,
      discussion: {
        mode: discussionMode,
        selectedEntryIds,
        sourceEntryIds: mergeKnowledgeSourceIds(
          selectedEntry ? [selectedEntry.id] : [],
          selectedEntryIds,
          discussionState.citations.map((citation) => citation.id)
        ),
        userPrompt: latestUserPrompt,
        assistantReply: latestAssistantReply,
        savedAt: new Date().toISOString(),
      },
    });
  };

  const handleCreateGenerated = async () => {
    const payload = buildSavePayload();
    if (!payload) {
      toast.info("当前没有可保存的生成草稿");
      return;
    }

    setDiscussionState((current) => ({
      ...current,
      isSaving: true,
      pendingAction: "create",
      saveError: null,
    }));

    try {
      const response = await knowledgeWorkshopAPI.createGeneratedNote(payload);
      setDiscussionState((current) => ({
        ...current,
        draft: null,
        isSaving: false,
        pendingAction: null,
        saveError: null,
      }));
      applyNavigationState(
        buildKnowledgeGeneratedEntryNavigationState(response.entry)
      );
      setListReloadKey((value) => value + 1);
      setGeneratedReloadKey((value) => value + 1);
      setAppendTargetId(response.entry.id);
      toast.success(`已保存生成笔记：${response.entry.title}`);
    } catch (error) {
      const message = getErrorMessage(error, "保存生成笔记失败");
      setDiscussionState((current) =>
        preserveKnowledgeDiscussionStateOnSaveFailure(current, message)
      );
      toast.error(message);
    }
  };

  const handleAppendGenerated = async () => {
    const payload = buildSavePayload();
    if (!payload) {
      toast.info("当前没有可追加的生成草稿");
      return;
    }

    if (!appendTargetId) {
      toast.error("先选择一个要追加的生成笔记");
      return;
    }

    setDiscussionState((current) => ({
      ...current,
      isSaving: true,
      pendingAction: "append",
      saveError: null,
    }));

    try {
      const response = await knowledgeWorkshopAPI.appendGeneratedNote(appendTargetId, {
        content_markdown: payload.content_markdown,
        tags: payload.tags,
        source_capture_ids: payload.source_capture_ids,
        source_filter_snapshot: payload.source_filter_snapshot,
        discussion_metadata: payload.discussion_metadata,
      });

      setDiscussionState((current) => ({
        ...current,
        draft: null,
        isSaving: false,
        pendingAction: null,
        saveError: null,
      }));
      applyNavigationState(
        buildKnowledgeGeneratedEntryNavigationState(response.entry)
      );
      setListReloadKey((value) => value + 1);
      setGeneratedReloadKey((value) => value + 1);
      setAppendTargetId(response.entry.id);
      toast.success("已追加到现有生成笔记");
    } catch (error) {
      const message = getErrorMessage(error, "追加生成笔记失败");
      setDiscussionState((current) =>
        preserveKnowledgeDiscussionStateOnSaveFailure(current, message)
      );
      toast.error(message);
    }
  };

  const handleKeepChatOnly = () => {
    setDiscussionState((current) => ({
      ...current,
      draft: null,
      pendingAction: "keep_chat",
      saveError: null,
      isSaving: false,
    }));
    toast.info("已移除待保存草稿，仅保留对话记录");
  };

  const listTitle = getKnowledgeWorkshopListTitle(filters.contentKind);

  return (
    <div className="min-h-screen xl:h-screen">
      <main className="mx-auto flex min-h-screen max-w-[1880px] flex-col px-5 pb-6 pt-24 xl:h-screen">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              ← 返回
            </button>
            <div className={pagePanelClassName}>Capture / Knowledge</div>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            统一知识库检索、AI 讨论、手动写回生成内容
          </p>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 gap-5 xl:grid-cols-[320px,minmax(0,1.1fr),minmax(360px,0.92fr)]">
          <KnowledgeSidebar
            filters={filters}
            projectOptions={projectOptions}
            categoryOptions={categoryOptions}
            importDraft={importDraft}
            isImporting={isImporting}
            importError={importError}
            onFiltersChange={updateFilters}
            onImportDraftChange={(draft) =>
              setImportDraft({
                ...draft,
                fileSourceType:
                  draft.mode === "file"
                    ? draft.file !== importDraft.file
                      ? inferUploadSourceType(draft.file)
                      : draft.fileSourceType || inferUploadSourceType(draft.file)
                    : draft.fileSourceType,
              })
            }
            onSubmitImport={handleImportSubmit}
          />

          <KnowledgeBrowser
            listTitle={listTitle}
            entries={entries}
            visibleEntries={visibleEntries}
            selectedEntryId={selectedEntryId}
            selectedEntryIds={selectedEntryIds}
            selectedEntry={selectedEntry}
            projectNameById={projectNameById}
            searchInput={searchInput}
            activeSearchQuery={activeSearchQuery}
            isLoading={isLoadingEntries}
            loadError={loadError}
            onSearchInputChange={setSearchInput}
            onApplySearch={handleApplySearch}
            onClearSearch={handleClearSearch}
            onRefresh={() => setListReloadKey((value) => value + 1)}
            onSelectEntry={handleSelectEntry}
            onToggleEntrySelection={handleToggleEntrySelection}
          />

          <KnowledgeDiscussionPanel
            mode={discussionMode}
            messages={discussionState.messages}
            citations={discussionState.citations}
            draft={discussionState.draft}
            discussionInput={discussionInput}
            isDiscussing={isDiscussing}
            isSaving={discussionState.isSaving}
            saveError={discussionState.saveError}
            selectedEntry={selectedEntry}
            selectedEntries={selectedEntries}
            generatedEntries={generatedEntries}
            appendTargetId={appendTargetId}
            projectNameById={projectNameById}
            onModeChange={setDiscussionMode}
            onDiscussionInputChange={setDiscussionInput}
            onSendDiscussion={handleSendDiscussion}
            onDraftChange={(draft) =>
              setDiscussionState((current) => ({
                ...current,
                draft,
                saveError: null,
              }))
            }
            onSelectCitation={handleSelectCitation}
            onAppendTargetChange={setAppendTargetId}
            onCreateGenerated={handleCreateGenerated}
            onAppendGenerated={handleAppendGenerated}
            onKeepChatOnly={handleKeepChatOnly}
          />
        </div>
      </main>
    </div>
  );
};

export default QuickCapturePage;
