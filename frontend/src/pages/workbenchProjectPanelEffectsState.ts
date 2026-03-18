import type { ProjectRecordDTO } from "../utils/api";
import type {
  ProjectPanelEffect,
  ProjectPanelMessage,
  ProjectPanelRefreshResult,
  ProjectPanelRunMeta,
} from "./workbenchProjectPanelState";

export interface ProjectInsightRow extends ProjectRecordDTO {
  incompleteStepCount: number;
}

export interface ProjectInsightSummary {
  totalProjects: number;
  attentionProjects: number;
  incompleteSteps: number;
  topProjects: ProjectInsightRow[];
}

export interface LatestAssistantRunState {
  provider: string;
  outcome: ProjectPanelRunMeta["outcome"];
  executedAt: string;
  effectSummary: string;
  refreshSummary: string;
}

const STATUS_WEIGHT: Record<string, number> = {
  有阻塞: 2,
  需关注: 1,
  正常推进: 0,
};

export const buildEffectSummary = (effects: readonly ProjectPanelEffect[] | undefined): string => {
  if (!Array.isArray(effects) || effects.length === 0) {
    return "";
  }

  return effects
    .map((effect) => String(effect.summary || "").trim())
    .filter((summary) => summary.length > 0)
    .join("，");
};

export const buildRefreshResultSummary = (
  refreshResults: readonly ProjectPanelRefreshResult[] | undefined
): string => {
  if (!Array.isArray(refreshResults) || refreshResults.length === 0) {
    return "";
  }

  return refreshResults
    .map((result) => `${result.label} ${result.success ? "已刷新" : "刷新失败"}`)
    .join("，");
};

export const getLatestAssistantRunState = (
  messages: readonly ProjectPanelMessage[]
): LatestAssistantRunState | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant" || !message.runMeta) {
      continue;
    }

    return {
      provider: message.provider ?? "",
      outcome: message.runMeta.outcome,
      executedAt: message.runMeta.executedAt,
      effectSummary: buildEffectSummary(message.effects),
      refreshSummary: buildRefreshResultSummary(message.refreshResults),
    };
  }

  return null;
};

export const deriveProjectInsights = (
  projects: readonly ProjectRecordDTO[]
): ProjectInsightSummary => {
  const rows: ProjectInsightRow[] = projects.map((project) => ({
    ...project,
    incompleteStepCount: project.steps.filter((step) => step.done !== true).length,
  }));

  const topProjects = [...rows]
    .sort((left, right) => {
      const nextActionOrder = Number(Boolean(right.nextAction?.trim())) - Number(Boolean(left.nextAction?.trim()));
      if (nextActionOrder !== 0) {
        return nextActionOrder;
      }

      const statusOrder = (STATUS_WEIGHT[right.status] ?? 0) - (STATUS_WEIGHT[left.status] ?? 0);
      if (statusOrder !== 0) {
        return statusOrder;
      }

      const stepOrder = right.incompleteStepCount - left.incompleteStepCount;
      if (stepOrder !== 0) {
        return stepOrder;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .slice(0, 5);

  return {
    totalProjects: rows.length,
    attentionProjects: rows.filter((project) => project.status === "需关注" || project.status === "有阻塞").length,
    incompleteSteps: rows.reduce((total, project) => total + project.incompleteStepCount, 0),
    topProjects,
  };
};
