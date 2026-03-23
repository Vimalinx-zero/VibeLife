import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

import FileExplorer from "../components/FileExplorer";
import KnowledgeDiscussionPanel from "../components/knowledge/KnowledgeDiscussionPanel";
import NotesKnowledgeChatPanel from "../components/notes/NotesKnowledgeChatPanel";
import NotesPreviewPanel from "../components/notes/NotesPreviewPanel";
import { useToast } from "../context/ToastContext";
import {
  apiClient,
  knowledgeWorkshopAPI,
  quickCaptureAPI,
  type KnowledgeDraftDTO,
  type KnowledgeDiscussionMessageDTO,
  type QuickCaptureRecordDTO,
} from "../utils/api";
import {
  buildKnowledgeGeneratedSavePayload,
  preserveKnowledgeDiscussionStateOnSaveFailure,
  trimKnowledgeDiscussionHistory,
  type KnowledgeDiscussionStateLike,
} from "./knowledgeWorkshopState";
import {
  buildNotesKnowledgeContext,
  buildNotesPreviewDocument,
  type NotesKnowledgeNodeLike,
} from "./notesKnowledgeWorkspaceState";
import {
  getNotesLeftPaneState,
  getNotesRightPaneState,
  getNotesWorkspaceGridClassName,
} from "./notesWorkspaceLayoutState";
import { getNotesDisplayName } from "./notesWorkspaceCopyState";
import { getNotesWorkspaceVisualProfile } from "./notesWorkspaceVisualState";

interface NoteItem {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  parent_id?: string;
  tags?: string[];
  date?: string;
}

interface NoteInfo {
  id: string;
  type: "file" | "folder";
  name: string;
  content?: string;
  parent_id?: string;
  tags?: string[];
  date?: string;
}

interface ViewData {
  info: NoteInfo;
  items: NoteItem[];
  breadcrumbs: Array<{ id: string; name: string }>;
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  item: NoteItem | null;
}

interface KnowledgeCitationLike {
  id: string;
  title: string;
}

interface KnowledgeDiscussionUiState extends KnowledgeDiscussionStateLike {
  citations: KnowledgeCitationLike[];
  draft: KnowledgeDraftDTO | null;
}

const createInitialDiscussionState = (): KnowledgeDiscussionUiState => ({
  messages: [],
  citations: [],
  draft: null,
  pendingAction: null,
  saveError: null,
  isSaving: false,
});

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

const getLatestMessageContent = (
  messages: readonly KnowledgeDiscussionMessageDTO[],
  role: "user" | "assistant"
) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === role) {
      return messages[index]?.content ?? "";
    }
  }
  return "";
};

const NotesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [currentId, setCurrentId] = useState("root");
  const [viewData, setViewData] = useState<ViewData>({
    info: { id: "root", type: "folder", name: "Library" },
    items: [],
    breadcrumbs: [],
  });
  const [activeFile, setActiveFile] = useState<NoteItem | null>(null);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    item: null,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<"file" | "folder">("file");
  const [newItemSourceType, setNewItemSourceType] = useState<
    "none" | "url" | "image" | "pdf" | "doc" | "video"
  >("none");
  const [newItemSourceUri, setNewItemSourceUri] = useState("");
  const [creatingItem, setCreatingItem] = useState(false);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveViewData, setMoveViewData] = useState<ViewData>({
    info: { id: "root", type: "folder", name: "Library" },
    items: [],
    breadcrumbs: [],
  });
  const [isMoveLoading, setIsMoveLoading] = useState(false);

  const [discussionState, setDiscussionState] = useState<KnowledgeDiscussionUiState>(
    () => createInitialDiscussionState()
  );
  const [discussionInput, setDiscussionInput] = useState("");
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [isRightPaneCollapsed, setIsRightPaneCollapsed] = useState(false);
  const [generatedEntries, setGeneratedEntries] = useState<QuickCaptureRecordDTO[]>([]);
  const [appendTargetId, setAppendTargetId] = useState<string | null>(null);
  const [generatedReloadKey, setGeneratedReloadKey] = useState(0);

  const openCreateModal = (type: "file" | "folder") => {
    setNewItemType(type);
    setNewItemName("");
    setNewItemSourceType("none");
    setNewItemSourceUri("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewItemName("");
    setNewItemSourceType("none");
    setNewItemSourceUri("");
  };

  const loadMoveNode = async (id: string) => {
    setIsMoveLoading(true);
    try {
      const res = await apiClient.get(`/notes/view?id=${id}`);
      setMoveViewData(res.data);
    } catch (error) {
      toast.error("加载移动目录失败");
    } finally {
      setIsMoveLoading(false);
    }
  };

  const loadNode = async (id: string) => {
    try {
      const res = await apiClient.get(`/notes/view?id=${id}`);
      const targetData = res.data as ViewData;

      setCurrentId(id);

      if (targetData.info.type === "folder") {
        setViewData(targetData);
        setActiveFile(null);
        return;
      }

      setActiveFile(targetData.info as NoteItem);

      if (targetData.info.parent_id && viewData.info.id !== targetData.info.parent_id) {
        const parentRes = await apiClient.get(`/notes/view?id=${targetData.info.parent_id}`);
        setViewData(parentRes.data as ViewData);
      }
    } catch (error) {
      toast.error("加载笔记失败");
    }
  };

  useEffect(() => {
    void loadNode("root");
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const noteId = urlParams.get("id");

    if (noteId && noteId !== currentId) {
      void loadNode(noteId);
    }
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    const loadGeneratedEntries = async () => {
      try {
        const nextEntries = await knowledgeWorkshopAPI.listEntries({
          contentKind: "generated",
        });
        if (!cancelled) {
          setGeneratedEntries(nextEntries);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load generated entries:", error);
        }
      }
    };

    void loadGeneratedEntries();

    return () => {
      cancelled = true;
    };
  }, [generatedReloadKey]);

  useEffect(() => {
    setDiscussionState(createInitialDiscussionState());
    setDiscussionInput("");
    setAppendTargetId(null);
  }, [currentId]);

  const sortedItems = useMemo(() => {
    return [...viewData.items].sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "folder" ? -1 : 1;
      }
      return left.name.localeCompare(right.name, "zh-CN");
    });
  }, [viewData.items]);

  const selectedNode = useMemo<NotesKnowledgeNodeLike | null>(() => {
    if (activeFile) {
      return {
        id: activeFile.id,
        type: "file",
        name: activeFile.name,
        content: activeFile.content,
      };
    }

    if (viewData.info?.id) {
      return {
        id: viewData.info.id,
        type: viewData.info.type,
        name: viewData.info.name,
        content: viewData.info.content,
      };
    }

    return null;
  }, [activeFile, viewData.info]);

  const knowledgeContext = useMemo(
    () =>
      buildNotesKnowledgeContext({
        selectedNode,
        visibleItems: viewData.items,
      }),
    [selectedNode, viewData.items]
  );

  const previewDocument = useMemo(
    () =>
      buildNotesPreviewDocument({
        selectedNode,
      }),
    [selectedNode]
  );

  const currentSourceCount = useMemo(
    () => viewData.items.filter((item) => item.type === "file").length,
    [viewData.items]
  );

  const contextLabel = activeFile
    ? `当前笔记：${activeFile.name}`
    : `${getNotesDisplayName(viewData.info.name)} · ${knowledgeContext.selectedEntryIds.length || currentSourceCount} 个文件来源`;
  const visualProfile = getNotesWorkspaceVisualProfile("focus-chat");
  const leftPaneState = getNotesLeftPaneState({
    hasActiveFile: Boolean(activeFile),
  });
  const rightPaneState = getNotesRightPaneState({
    collapsed: isRightPaneCollapsed,
  });
  const gridClassName = getNotesWorkspaceGridClassName({
    hasActiveFile: Boolean(activeFile),
    rightPaneCollapsed: isRightPaneCollapsed,
  });

  const createItem = async () => {
    if (!newItemName.trim() || creatingItem) {
      return;
    }

    const parentId = viewData.info.type === "file" ? viewData.info.parent_id : viewData.info.id;
    setCreatingItem(true);

    try {
      const createRes = await apiClient.post("/notes/create", {
        parent_id: parentId || "root",
        name: newItemName.trim(),
        type: newItemType,
      });

      const createdId = createRes?.data?.item?.id as string | undefined;

      if (newItemType === "file" && newItemSourceType !== "none" && newItemSourceUri.trim() && createdId) {
        try {
          const capture = await quickCaptureAPI.capture({
            source_type: newItemSourceType,
            source_uri: newItemSourceUri.trim(),
            title: newItemName.trim(),
          });

          await apiClient.post("/notes/save", {
            id: createdId,
            content:
              `# ${newItemName.trim()}\n\n` +
              `> 来源类型：${newItemSourceType}\n` +
              `> 来源地址：${newItemSourceUri.trim()}\n\n` +
              `## 摘要\n${capture.summary || ""}\n`,
            name: newItemName.trim(),
            tags: capture.tags || [],
          });
        } catch (error) {
          console.error("Quick capture failed:", error);
          toast.warning("笔记已创建，但来源采集失败");
        }
      }

      closeCreateModal();
      await loadNode(parentId || "root");
      if (createdId && newItemType === "file") {
        await loadNode(createdId);
      }
      toast.success(newItemType === "folder" ? "文件夹已创建" : "笔记已创建");
    } catch (error) {
      toast.error("创建失败");
    } finally {
      setCreatingItem(false);
    }
  };

  const submitRename = async () => {
    if (!ctxMenu.item || !newItemName.trim()) {
      return;
    }

    try {
      await apiClient.post("/notes/save", {
        id: ctxMenu.item.id,
        name: newItemName.trim(),
      });

      if (activeFile?.id === ctxMenu.item.id) {
        setActiveFile((current) =>
          current
            ? {
                ...current,
                name: newItemName.trim(),
              }
            : current
        );
      }

      await loadNode(viewData.info.id);
      setShowRenameModal(false);
      toast.success("已重命名");
    } catch (error) {
      toast.error("重命名失败");
    }
  };

  const submitDelete = async () => {
    if (!ctxMenu.item) {
      return;
    }

    try {
      await apiClient.post("/notes/delete", { id: ctxMenu.item.id });
      if (activeFile?.id === ctxMenu.item.id) {
        setActiveFile(null);
      }
      await loadNode(viewData.info.id);
      setShowDeleteModal(false);
      toast.success("已删除");
    } catch (error) {
      toast.error("删除失败");
    }
  };

  const submitMove = async () => {
    if (!ctxMenu.item) {
      return;
    }

    const targetId = moveViewData.info.id;
    if (targetId === ctxMenu.item.id) {
      toast.warning("不能移动到自己内部");
      return;
    }
    if (targetId === ctxMenu.item.parent_id) {
      toast.info("已经在当前目录");
      return;
    }

    try {
      await apiClient.post("/notes/save", {
        id: ctxMenu.item.id,
        parent_id: targetId,
      });
      await loadNode(viewData.info.id);
      setShowMoveModal(false);
      toast.success(`已移动到 ${moveViewData.info.name}`);
    } catch (error) {
      toast.error("移动失败");
    }
  };

  const sendDiscussion = async () => {
    if (isDiscussing || !discussionInput.trim()) {
      return;
    }

    if (knowledgeContext.mode === "selection" && knowledgeContext.selectedEntryIds.length === 0) {
      toast.warning("当前文件夹里还没有可讨论的文件");
      return;
    }

    const userMessage: KnowledgeDiscussionMessageDTO = {
      role: "user",
      content: discussionInput.trim(),
    };
    const history = trimKnowledgeDiscussionHistory(discussionState.messages);

    setDiscussionState((current) => ({
      ...current,
      messages: [...current.messages, userMessage],
      saveError: null,
    }));
    setDiscussionInput("");
    setIsDiscussing(true);

    try {
      const response = await knowledgeWorkshopAPI.discuss(
        knowledgeContext.mode === "entry"
          ? {
              mode: "entry",
              message: userMessage.content,
              history,
              entry_id: knowledgeContext.selectedEntryId ?? undefined,
            }
          : {
              mode: "selection",
              message: userMessage.content,
              history,
              selection: {
                content_kind: "collected",
                selected_entry_ids: knowledgeContext.selectedEntryIds,
              },
            }
      );

      setDiscussionState((current) => ({
        ...current,
        messages: [
          ...current.messages,
          {
            role: "assistant",
            content: response.reply,
          },
        ],
        citations: (response.citations ?? []).map((citation) => ({
          id: citation.id,
          title: citation.title,
        })),
        draft: response.draft,
        pendingAction: null,
        saveError: null,
        isSaving: false,
      }));
    } catch (error) {
      const message = getErrorMessage(error, "AI 对话失败");
      toast.error(message);
      setDiscussionState((current) => ({
        ...current,
        saveError: message,
      }));
    } finally {
      setIsDiscussing(false);
    }
  };

  const handleDraftChange = (draft: KnowledgeDraftDTO) => {
    setDiscussionState((current) => ({
      ...current,
      draft,
      saveError: null,
    }));
  };

  const handleKeepChatOnly = () => {
    setDiscussionState((current) => ({
      ...current,
      draft: null,
      pendingAction: null,
      saveError: null,
      isSaving: false,
    }));
  };

  const handleCreateGenerated = async () => {
    if (!discussionState.draft || discussionState.isSaving) {
      return;
    }

    const payload = buildKnowledgeGeneratedSavePayload({
      draft: discussionState.draft,
      filters: {
        contentKind: "collected",
        projectId: null,
        category: null,
      },
      discussion: {
        mode: knowledgeContext.mode,
        selectedEntryIds: knowledgeContext.selectedEntryIds,
        sourceEntryIds: knowledgeContext.selectedEntryIds,
        userPrompt: getLatestMessageContent(discussionState.messages, "user"),
        assistantReply: getLatestMessageContent(discussionState.messages, "assistant"),
        savedAt: new Date().toISOString(),
      },
    });

    setDiscussionState((current) => ({
      ...current,
      isSaving: true,
      pendingAction: "create",
      saveError: null,
    }));

    try {
      const response = await knowledgeWorkshopAPI.createGeneratedNote(payload);
      setAppendTargetId(response.entry.id);
      setGeneratedReloadKey((current) => current + 1);
      setDiscussionState((current) => ({
        ...current,
        isSaving: false,
        pendingAction: null,
        draft: null,
        saveError: null,
      }));
      toast.success("已保存到 Studio");
    } catch (error) {
      const message = getErrorMessage(error, "保存失败");
      setDiscussionState((current) =>
        preserveKnowledgeDiscussionStateOnSaveFailure(current, message)
      );
      toast.error(message);
    }
  };

  const handleAppendGenerated = async () => {
    if (!discussionState.draft || !appendTargetId || discussionState.isSaving) {
      return;
    }

    const payload = buildKnowledgeGeneratedSavePayload({
      draft: discussionState.draft,
      filters: {
        contentKind: "collected",
        projectId: null,
        category: null,
      },
      discussion: {
        mode: knowledgeContext.mode,
        selectedEntryIds: knowledgeContext.selectedEntryIds,
        sourceEntryIds: knowledgeContext.selectedEntryIds,
        userPrompt: getLatestMessageContent(discussionState.messages, "user"),
        assistantReply: getLatestMessageContent(discussionState.messages, "assistant"),
        savedAt: new Date().toISOString(),
      },
    });

    setDiscussionState((current) => ({
      ...current,
      isSaving: true,
      pendingAction: "append",
      saveError: null,
    }));

    try {
      await knowledgeWorkshopAPI.appendGeneratedNote(appendTargetId, {
        content_markdown: payload.content_markdown,
        tags: payload.tags,
        source_capture_ids: payload.source_capture_ids,
        source_filter_snapshot: payload.source_filter_snapshot,
        discussion_metadata: payload.discussion_metadata,
      });
      setGeneratedReloadKey((current) => current + 1);
      setDiscussionState((current) => ({
        ...current,
        isSaving: false,
        pendingAction: null,
        draft: null,
        saveError: null,
      }));
      toast.success("已追加到现有生成内容");
    } catch (error) {
      const message = getErrorMessage(error, "追加失败");
      setDiscussionState((current) =>
        preserveKnowledgeDiscussionStateOnSaveFailure(current, message)
      );
      toast.error(message);
    }
  };

  return (
    <div
      className={`${visualProfile.pageShellClassName} min-h-screen px-4 pb-6 pt-20 text-slate-100 md:px-6`}
      onClick={() => setCtxMenu((current) => ({ ...current, show: false }))}
      onContextMenu={() => setCtxMenu((current) => ({ ...current, show: false }))}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(216,207,182,0.08),rgba(11,16,22,0))]" />
        <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-[#d8cfb6]/[0.06] blur-3xl" />
        <div className="absolute right-[-4rem] top-44 h-80 w-80 rounded-full bg-[#6f859c]/[0.08] blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-[calc(100vh-6.5rem)] max-w-[1880px] flex-col gap-5">
        <div className={`grid min-h-0 flex-1 gap-5 ${gridClassName}`}>
          <div className={leftPaneState.containerClassName}>
            {leftPaneState.showExplorer ? (
              <FileExplorer
                viewData={viewData}
                currentId={currentId}
                sortedItems={sortedItems}
                onLoadNode={loadNode}
                onCreateItem={openCreateModal}
                onContextMenu={(event: MouseEvent, item: NoteItem | null) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setCtxMenu({
                    show: true,
                    x: event.clientX,
                    y: event.clientY,
                    item,
                  });
                }}
                onDropItem={async (draggedId: string, targetId: string) => {
                  try {
                    await apiClient.post("/notes/save", {
                      id: draggedId,
                      parent_id: targetId,
                    });
                    await loadNode(viewData.info.id);
                    toast.success("已移动");
                  } catch (error) {
                    toast.error("移动失败");
                  }
                }}
                className="h-full w-full"
                listClassName="max-h-none"
                showSettingsButton={false}
                tone={visualProfile.leftTone === "quiet" ? "quiet-dark" : "default"}
              />
            ) : null}

            {leftPaneState.showPreview ? (
              <NotesPreviewPanel
                title={previewDocument.title}
                content={previewDocument.content}
                empty={previewDocument.empty}
                selectionType="file"
                itemCount={currentSourceCount}
                className={leftPaneState.previewPanelClassName}
                showBackButton={leftPaneState.showBackButton}
                onBack={() => {
                  setActiveFile(null);
                  setCurrentId(viewData.info.id);
                  navigate(
                    viewData.info.id === "root" ? "/notes" : `/notes?id=${viewData.info.id}`,
                    { replace: true }
                  );
                }}
              />
            ) : null}
          </div>

          <NotesKnowledgeChatPanel
            contextLabel={contextLabel}
            messages={discussionState.messages}
            citations={discussionState.citations}
            discussionInput={discussionInput}
            isDiscussing={isDiscussing}
            onDiscussionInputChange={setDiscussionInput}
            onSendDiscussion={sendDiscussion}
            onSelectCitation={(citationId) => {
              void loadNode(citationId);
            }}
          />

          {rightPaneState.showPanel ? (
            <KnowledgeDiscussionPanel
              draft={discussionState.draft}
              isSaving={discussionState.isSaving}
              saveError={discussionState.saveError}
              generatedEntries={generatedEntries}
              appendTargetId={appendTargetId}
              projectNameById={{}}
              collapseLabel={rightPaneState.actionLabel}
              onDraftChange={handleDraftChange}
              onSelectGeneratedEntry={(entryId) => {
                setAppendTargetId(entryId);
              }}
              onAppendTargetChange={setAppendTargetId}
              onCreateGenerated={handleCreateGenerated}
              onAppendGenerated={handleAppendGenerated}
              onKeepChatOnly={handleKeepChatOnly}
              onToggleCollapse={() => setIsRightPaneCollapsed(true)}
            />
          ) : null}

          {rightPaneState.showCollapsedRail ? (
            <aside className={rightPaneState.railClassName}>
              <button
                type="button"
                onClick={() => setIsRightPaneCollapsed(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-lg text-white transition hover:bg-white/[0.1]"
                aria-label={rightPaneState.actionLabel}
                title={rightPaneState.actionLabel}
              >
                &gt;
              </button>
              <span className="mt-4 text-[11px] font-semibold tracking-[0.22em] text-slate-500 [writing-mode:vertical-rl]">
                生成区
              </span>
            </aside>
          ) : null}
        </div>
      </div>

      {ctxMenu.show ? (
        <div
          className="fixed z-[999] w-48 overflow-hidden rounded-xl border border-white/12 bg-[#11161d]/92 py-1 shadow-2xl backdrop-blur-xl"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={(event) => event.stopPropagation()}
        >
          {ctxMenu.item ? (
            <>
              <div className="mb-1 border-b border-white/8 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {ctxMenu.item.name}
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewItemName(ctxMenu.item?.name ?? "");
                  setShowRenameModal(true);
                  setCtxMenu((current) => ({ ...current, show: false }));
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-white/8"
              >
                重命名
              </button>
              <button
                type="button"
                onClick={() => {
                  void loadMoveNode("root");
                  setShowMoveModal(true);
                  setCtxMenu((current) => ({ ...current, show: false }));
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-white/8"
              >
                移动到...
              </button>
              <div className="my-1 h-px bg-white/8" />
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(true);
                  setCtxMenu((current) => ({ ...current, show: false }));
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-400/10"
              >
                删除
              </button>
            </>
          ) : (
            <>
              <div className="mb-1 border-b border-white/8 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Folder Actions
              </div>
              <button
                type="button"
                onClick={() => {
                  openCreateModal("folder");
                  setCtxMenu((current) => ({ ...current, show: false }));
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-white/8"
              >
                新建文件夹
              </button>
              <button
                type="button"
                onClick={() => {
                  openCreateModal("file");
                  setCtxMenu((current) => ({ ...current, show: false }));
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-white/8"
              >
                新建笔记
              </button>
            </>
          )}
        </div>
      ) : null}

      <AnimatePresence>
        {showCreateModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={closeCreateModal}
          >
            <div
              className="w-[360px] rounded-3xl border border-white/10 bg-[#141a22] p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="mb-4 text-lg font-semibold text-white">
                新建{newItemType === "folder" ? "文件夹" : "笔记"}
              </h3>
              <input
                autoFocus
                type="text"
                className="mb-4 w-full rounded-xl border border-white/10 bg-[#1d2430] px-4 py-3 text-sm text-white outline-none"
                placeholder="输入名称..."
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void createItem();
                  }
                }}
              />

              {newItemType === "file" ? (
                <div className="mb-4 space-y-2">
                  <select
                    value={newItemSourceType}
                    onChange={(event) =>
                      setNewItemSourceType(
                        event.target.value as "none" | "url" | "image" | "pdf" | "doc" | "video"
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#1d2430] px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="none">普通新建</option>
                    <option value="url">来源：链接</option>
                    <option value="image">来源：图片</option>
                    <option value="pdf">来源：PDF</option>
                    <option value="doc">来源：文档</option>
                    <option value="video">来源：视频</option>
                  </select>

                  {newItemSourceType !== "none" ? (
                    <input
                      type="text"
                      value={newItemSourceUri}
                      onChange={(event) => setNewItemSourceUri(event.target.value)}
                      placeholder="输入 URL 或本地文件路径"
                      className="w-full rounded-xl border border-white/10 bg-[#1d2430] px-4 py-3 text-sm text-white outline-none"
                    />
                  ) : null}
                </div>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void createItem()}
                  disabled={
                    creatingItem ||
                    !newItemName.trim() ||
                    (newItemType === "file" &&
                      newItemSourceType !== "none" &&
                      !newItemSourceUri.trim())
                  }
                  className="flex-1 rounded-xl bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingItem ? "创建中..." : "创建"}
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {showRenameModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRenameModal(false)}
          >
            <div
              className="w-[360px] rounded-3xl border border-white/10 bg-[#141a22] p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="mb-4 text-lg font-semibold text-white">重命名</h3>
              <input
                autoFocus
                type="text"
                className="mb-4 w-full rounded-xl border border-white/10 bg-[#1d2430] px-4 py-3 text-sm text-white outline-none"
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void submitRename();
                  }
                }}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void submitRename()}
                  className="flex-1 rounded-xl bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  保存
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {showDeleteModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          >
            <div
              className="w-[360px] rounded-3xl border border-white/10 bg-[#141a22] p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="mb-3 text-lg font-semibold text-white">删除这条内容？</h3>
              <p className="mb-6 text-sm leading-7 text-slate-400">
                {ctxMenu.item?.name ?? "当前内容"} 会被删除。
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void submitDelete()}
                  className="flex-1 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white transition hover:bg-rose-400"
                >
                  删除
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {showMoveModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMoveModal(false)}
          >
            <div
              className="flex h-[520px] w-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#141a22] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-white/8 px-5 py-4">
                <h3 className="text-lg font-semibold text-white">移动到...</h3>
                <div className="mt-1 text-xs text-slate-500">{moveViewData.info.name}</div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {isMoveLoading ? (
                  <div className="py-12 text-center text-sm text-slate-500">加载中...</div>
                ) : (
                  <div className="space-y-2">
                    {moveViewData.info.id !== "root" ? (
                      <button
                        type="button"
                        onClick={() => void loadMoveNode(moveViewData.info.parent_id || "root")}
                        className="w-full rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-left text-sm text-slate-300 transition hover:bg-white/8"
                      >
                        返回上一级
                      </button>
                    ) : null}

                    {moveViewData.items
                      .filter(
                        (item) => item.type === "folder" && item.id !== ctxMenu.item?.id
                      )
                      .map((folder) => (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => void loadMoveNode(folder.id)}
                          className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/8"
                        >
                          <span>{folder.name}</span>
                          <span className="text-slate-500">›</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="border-t border-white/8 px-5 py-4">
                <div className="mb-3 text-xs text-slate-500">
                  目标目录：
                  {moveViewData.breadcrumbs.map((item) => getNotesDisplayName(item.name)).join(" / ") ||
                    "资料库"}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowMoveModal(false)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitMove()}
                    className="flex-1 rounded-xl bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                  >
                    移到这里
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default NotesPage;
