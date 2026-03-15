import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReactFlow, Background, Controls, MiniMap, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { apiClient, projectsAPI, type ProjectRecordDTO } from "../utils/api";

type ProjectCategory = "life" | "work" | "growth";

type ViewTab = "mindmap" | "notes" | "emails";

const statusColorClass: Record<ProjectRecord["status"], string> = {
  正常推进: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  需关注: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  有阻塞: "bg-red-500/15 text-red-700 dark:text-red-300"
};

const tabLabel: Record<ViewTab, string> = {
  mindmap: "思维导图",
  notes: "文件笔记",
  emails: "邮件"
};

const categoryLabel: Record<ProjectCategory, string> = {
  life: "生活",
  work: "工作",
  growth: "成长"
};

const categoryOrder: ProjectCategory[] = ["life", "work", "growth"];

interface ProjectRecord extends ProjectRecordDTO {
  category: ProjectCategory;
}

interface SearchNoteItem {
  id: string;
  name: string;
  content?: string;
  tags?: string[];
  date?: string;
}

const normalizeProjectCategory = (value: string): ProjectCategory | null => {
  if (value === "study") {
    return "growth";
  }
  if (value === "life" || value === "work" || value === "growth") {
    return value;
  }
  return null;
};

const ProjectsPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<ProjectCategory>("work");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeTab, setActiveTab] = useState<ViewTab>("mindmap");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectNotes, setProjectNotes] = useState<SearchNoteItem[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    let alive = true;
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const data = await projectsAPI.getProjects();
        const normalized = data
          .map((item) => {
            const category = normalizeProjectCategory(item.category);
            if (!category) {
              return null;
            }
            return { ...item, category };
          })
          .filter((item): item is ProjectRecord => item !== null);
        if (!alive) {
          return;
        }
        setProjects(normalized);
        if (!selectedProjectId && normalized.length > 0) {
          setSelectedProjectId(normalized[0].id);
        }
      } finally {
        if (alive) {
          setLoadingProjects(false);
        }
      }
    };
    loadProjects();
    return () => {
      alive = false;
    };
  }, [selectedProjectId]);

  const allProjects = useMemo(() => projects, [projects]);

  const selectedProject = useMemo(
    () => allProjects.find((project) => project.id === selectedProjectId) ?? allProjects[0] ?? null,
    [allProjects, selectedProjectId]
  );

  const projectsByCategory = useMemo(
    () => ({
      life: allProjects.filter((item) => item.category === "life"),
      work: allProjects.filter((item) => item.category === "work"),
      growth: allProjects.filter((item) => item.category === "growth")
    }),
    [allProjects]
  );

  const folderProjects = useMemo(() => projectsByCategory[activeCategory], [projectsByCategory, activeCategory]);

  const selectedProjectName = selectedProject?.name ?? "";
  const selectedProjectKey = selectedProject?.id ?? "";

  useEffect(() => {
    if (!selectedProjectKey || !selectedProjectName) {
      setProjectNotes([]);
      return;
    }
    let alive = true;
    const loadNotes = async () => {
      setLoadingNotes(true);
      try {
        const query = encodeURIComponent(selectedProjectName);
        const response = await apiClient.get<{ results: SearchNoteItem[] }>(`/notes/search?query=${query}`);
        if (alive) {
          setProjectNotes(response.data.results || []);
        }
      } catch {
        if (alive) {
          setProjectNotes([]);
        }
      } finally {
        if (alive) {
          setLoadingNotes(false);
        }
      }
    };
    loadNotes();
    return () => {
      alive = false;
    };
  }, [selectedProjectKey, selectedProjectName]);

  const mindmapNodes = useMemo<Node[]>(() => {
    if (!selectedProject) {
      return [];
    }
    const rootId = `root-${selectedProject.id}`;
    const nodes: Node[] = [
      {
        id: rootId,
        position: { x: 300, y: 40 },
        data: { label: selectedProject.name },
        style: {
          borderRadius: 14,
          padding: 10,
          border: "1px solid rgba(99,102,241,0.4)",
          background: "rgba(99,102,241,0.1)",
          fontWeight: 700
        }
      }
    ];

    selectedProject.steps.forEach((step, index) => {
      nodes.push({
        id: step.id,
        position: { x: 120 + (index % 2) * 360, y: 150 + index * 110 },
        data: { label: `${index + 1}. ${step.title}` },
        style: {
          borderRadius: 10,
          padding: 8,
          border: "1px solid rgba(148,163,184,0.45)",
          background: "rgba(255,255,255,0.75)"
        }
      });
    });
    return nodes;
  }, [selectedProject]);

  const mindmapEdges = useMemo<Edge[]>(() => {
    if (!selectedProject) {
      return [];
    }
    const rootId = `root-${selectedProject.id}`;
    return selectedProject.steps.map((step) => ({
      id: `edge-${rootId}-${step.id}`,
      source: rootId,
      target: step.id,
      type: "smoothstep",
      animated: false
    }));
  }, [selectedProject]);

  const openProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab("mindmap");
  };

  return (
    <div className="fixed inset-0 bg-transparent text-slate-800 dark:text-slate-100 font-sans overflow-hidden flex flex-col">
      <div className="h-16 absolute top-6 left-0 w-full flex items-center px-8 z-50 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-sm font-bold text-sm hover:scale-105 transition-transform text-slate-600 dark:text-slate-300"
          >
            <span>←</span>
            <span>Exit</span>
          </button>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="px-5 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 border border-white/20 backdrop-blur-md text-sm font-semibold">
            项目跟踪
          </div>
        </div>
      </div>

      <div className="flex-1 flex pt-24 pb-6 px-6 gap-6 overflow-hidden items-start">
        <div className="shrink-0 h-[calc(100vh-10rem)] flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 w-72">
          <div className="w-full p-4 bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">项目文件夹</p>
            <div className="space-y-2">
              {categoryOrder.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`w-full flex items-center justify-between text-sm rounded-xl px-3 py-2 transition-colors ${
                    activeCategory === category
                      ? "bg-indigo-500 text-white"
                      : "bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20"
                  }`}
                >
                  <span className="font-semibold">{categoryLabel[category]}</span>
                  <span className="text-xs opacity-80">{projectsByCategory[category].length}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full p-4 bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{categoryLabel[activeCategory]}项目</p>
            <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto custom-scrollbar pr-1">
              {folderProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => openProject(project.id)}
                  className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                    selectedProject?.id === project.id
                      ? "border-indigo-400 bg-indigo-500/10"
                      : "border-white/30 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <p className="text-sm font-semibold dark:text-white text-gray-900 truncate">{project.name}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{project.subtitle}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-full w-full overflow-hidden flex justify-center">
          <div className="h-full w-full rounded-3xl bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-xl overflow-hidden">
            {selectedProject ? (
              <div className="h-full flex flex-col p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold dark:text-white text-gray-900">{selectedProject.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">{selectedProject.subtitle}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">下一步：{selectedProject.nextAction}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColorClass[selectedProject.status]}`}>
                    {selectedProject.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {(Object.keys(tabLabel) as ViewTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                        activeTab === tab
                          ? "bg-indigo-500 text-white"
                          : "bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {tabLabel[tab]}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                  {activeTab === "mindmap" && (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-white/30 dark:border-white/10 bg-white/50 dark:bg-black/20 overflow-hidden" style={{ height: 420 }}>
                        <ReactFlow nodes={mindmapNodes} edges={mindmapEdges} fitView>
                          <MiniMap />
                          <Controls />
                          <Background gap={18} size={1} />
                        </ReactFlow>
                      </div>
                    </div>
                  )}

                  {activeTab === "notes" && (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-dashed border-white/40 dark:border-white/20 p-3 bg-white/40 dark:bg-black/20">
                        <p className="text-xs text-gray-500">项目笔记总览</p>
                        <p className="text-sm font-semibold dark:text-white text-gray-900 mt-1">
                          这个标签页用于沉淀文档、链接与文件型笔记。
                        </p>
                      </div>

                      {selectedProject.resources.map((resource) => (
                        <div key={resource.id} className="rounded-xl border border-white/30 dark:border-white/10 p-3 bg-white/50 dark:bg-black/20">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold dark:text-white text-gray-900">{resource.name}</p>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                              {resource.kind}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{resource.note}</p>
                        </div>
                      ))}

                      <div className="mt-3 pt-3 border-t border-white/30 dark:border-white/10">
                        <p className="text-xs text-gray-500 mb-2">匹配到的真实笔记</p>
                        {loadingNotes ? (
                          <p className="text-sm text-gray-500">加载笔记中...</p>
                        ) : projectNotes.length > 0 ? (
                          <div className="space-y-2">
                            {projectNotes.slice(0, 8).map((note) => (
                              <div key={note.id} className="rounded-lg border border-white/30 dark:border-white/10 p-3 bg-white/40 dark:bg-black/20">
                                <p className="text-sm font-semibold dark:text-white text-gray-900">{note.name}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{note.content || "无内容预览"}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">没有匹配到相关笔记。</p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "emails" && (
                    <div className="space-y-2">
                      {selectedProject.emails.map((email) => (
                        <div key={email.id} className="rounded-xl border border-white/30 dark:border-white/10 p-3 bg-white/50 dark:bg-black/20">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold dark:text-white text-gray-900 truncate">{email.subject}</p>
                            <span className="text-xs text-gray-500">{email.time}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">发件人：{email.from}</p>
                          <p className="text-xs dark:text-gray-300 text-gray-700 mt-1">{email.summary}</p>
                          <span className="inline-flex mt-2 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            重要度：{email.importance}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">{loadingProjects ? "项目加载中..." : "请选择左侧项目"}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;
