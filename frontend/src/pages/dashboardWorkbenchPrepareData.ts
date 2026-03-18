export interface WorkbenchPreparedStep {
  id: string;
  title: string;
  owner: string;
  due: string;
}

export interface WorkbenchPreparedProject {
  projectId: string;
  name: string;
  status: string;
  nextAction: string;
  pendingSteps: WorkbenchPreparedStep[];
}

export interface WorkbenchPrepareSummary {
  dateKey: string;
  provider: string;
  coachMessage: string;
  dailyPlan: {
    planBatchId: string;
    createdCount: number;
    skippedCount: number;
    deletedCount: number;
  };
  projectDigest: {
    count: number;
    projects: WorkbenchPreparedProject[];
  };
}

export const normalizeWorkbenchPrepareData = (raw: any): WorkbenchPrepareSummary => ({
  dateKey: raw?.date_key || "",
  provider: raw?.provider || "openclaw",
  coachMessage: raw?.coach_message || "",
  dailyPlan: {
    planBatchId: raw?.daily_plan?.plan_batch_id || "",
    createdCount: raw?.daily_plan?.created_count || 0,
    skippedCount: raw?.daily_plan?.skipped_count || 0,
    deletedCount: raw?.daily_plan?.deleted_count || 0,
  },
  projectDigest: {
    count: raw?.project_digest?.count || 0,
    projects: Array.isArray(raw?.project_digest?.projects)
      ? raw.project_digest.projects.map((project: any) => ({
          projectId: project?.project_id || "",
          name: project?.name || "",
          status: project?.status || "",
          nextAction: project?.next_action || "",
          pendingSteps: Array.isArray(project?.pending_steps)
            ? project.pending_steps.map((step: any) => ({
                id: step?.id || "",
                title: step?.title || "",
                owner: step?.owner || "",
                due: step?.due || "",
              }))
            : [],
        }))
      : [],
  },
});
