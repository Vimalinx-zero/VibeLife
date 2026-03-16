const CATEGORY_PRIORITY = ["work", "life", "growth"] as const;

export type ProjectCategory = string;

export const normalizeProjectCategory = (value: string | null | undefined): ProjectCategory => {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return "work";
  }

  return normalized;
};

export const getProjectCategoryOrder = (
  projects: ReadonlyArray<{ category: string }>
): ProjectCategory[] => {
  const present = new Set<ProjectCategory>();
  const extras: ProjectCategory[] = [];

  for (const project of projects) {
    const category = normalizeProjectCategory(project.category);
    if (present.has(category)) {
      continue;
    }

    present.add(category);

    if (!CATEGORY_PRIORITY.includes(category as (typeof CATEGORY_PRIORITY)[number])) {
      extras.push(category);
    }
  }

  return [
    ...CATEGORY_PRIORITY.filter((category) => present.has(category)),
    ...extras,
  ];
};

export const getProjectCategoryLabel = (category: ProjectCategory): string => {
  if (category === "life") {
    return "生活";
  }

  if (category === "work") {
    return "工作";
  }

  if (category === "growth") {
    return "成长";
  }

  return category;
};
