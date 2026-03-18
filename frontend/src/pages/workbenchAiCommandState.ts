import type {
  ProjectPanelChatEffectDTO,
  ProjectPanelChatResponseDTO,
} from "../utils/api";

const buildEffectSummary = (
  effects: readonly ProjectPanelChatEffectDTO[] | undefined
): string => {
  if (!Array.isArray(effects) || effects.length === 0) {
    return "";
  }

  return effects
    .map((effect) => String(effect.summary || "").trim())
    .filter((summary) => summary.length > 0)
    .join("，");
};

export const buildWorkbenchAiSuccessToast = (
  response: Pick<ProjectPanelChatResponseDTO, "effects">
) => {
  const effectSummary = buildEffectSummary(response.effects);
  return effectSummary ? `AI 已处理：${effectSummary}` : "AI 已回复";
};

export const getWorkbenchAiRefreshTargets = (
  refreshHints: readonly ("todo" | "insights")[]
) => {
  const seen = new Set<"todo" | "insights">();
  const result: Array<"todo" | "insights"> = [];

  for (const hint of refreshHints) {
    if ((hint === "todo" || hint === "insights") && !seen.has(hint)) {
      seen.add(hint);
      result.push(hint);
    }
  }

  return result;
};

export const shouldOpenProjectsPanel = (
  refreshHints: readonly ("todo" | "insights")[]
) => getWorkbenchAiRefreshTargets(refreshHints).includes("insights");
