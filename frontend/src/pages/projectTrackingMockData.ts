export type ProjectCategory = "life" | "work" | "study";

export interface ProjectStep {
  id: string;
  title: string;
  owner: string;
  due: string;
  done: boolean;
}

export interface ProjectResource {
  id: string;
  name: string;
  kind: "文档" | "链接" | "文件";
  note: string;
}

export interface ProjectEmail {
  id: string;
  from: string;
  subject: string;
  summary: string;
  importance: "高" | "中" | "低";
  time: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  category: ProjectCategory;
  subtitle: string;
  status: "正常推进" | "需关注" | "有阻塞";
  nextAction: string;
  steps: ProjectStep[];
  resources: ProjectResource[];
  emails: ProjectEmail[];
}

export const categoryLabel: Record<ProjectCategory, string> = {
  life: "生活",
  work: "工作",
  study: "学习",
};

export const categoryOrder: ProjectCategory[] = ["life", "work", "study"];

export const mockProjects: ProjectRecord[] = [
  {
    id: "life-family-trip",
    name: "家庭春游计划",
    category: "life",
    subtitle: "4月出行安排与预算",
    status: "正常推进",
    nextAction: "本周确认酒店与车票",
    steps: [
      { id: "s1", title: "确认出行日期", owner: "我", due: "03-10", done: true },
      { id: "s2", title: "比较酒店方案", owner: "我", due: "03-12", done: false },
      { id: "s3", title: "整理预算表", owner: "我", due: "03-14", done: false },
    ],
    resources: [
      { id: "r1", name: "行程草案", kind: "文档", note: "按2天1晚版本" },
      { id: "r2", name: "酒店候选清单", kind: "链接", note: "优先亲子酒店" },
    ],
    emails: [
      {
        id: "e1",
        from: "travel@offer.com",
        subject: "周末酒店优惠提醒",
        summary: "近7天有家庭房折扣，需尽快下单。",
        importance: "中",
        time: "今天 10:42",
      },
    ],
  },
  {
    id: "life-fitness",
    name: "体重管理计划",
    category: "life",
    subtitle: "12周饮食 + 训练执行",
    status: "需关注",
    nextAction: "补齐本周训练记录",
    steps: [
      { id: "s4", title: "记录每日饮食", owner: "我", due: "每天", done: false },
      { id: "s5", title: "每周复盘体重趋势", owner: "我", due: "周日", done: false },
    ],
    resources: [
      { id: "r3", name: "训练模板", kind: "文件", note: "A/B 交替" },
    ],
    emails: [
      {
        id: "e2",
        from: "coach@health.fit",
        subject: "本周训练反馈",
        summary: "建议增加有氧时长，晚餐控制碳水。",
        importance: "高",
        time: "昨天 20:15",
      },
    ],
  },
  {
    id: "work-project-tracker",
    name: "项目跟踪界面改版",
    category: "work",
    subtitle: "首页入口 + 项目详情页",
    status: "正常推进",
    nextAction: "确认交互细节并补视觉样式",
    steps: [
      { id: "s6", title: "完成入口交互草图", owner: "Wilson", due: "03-08", done: true },
      { id: "s7", title: "输出高保真UI", owner: "Wilson", due: "03-09", done: false },
      { id: "s8", title: "完成前端联调", owner: "Wilson", due: "03-11", done: false },
    ],
    resources: [
      { id: "r4", name: "UI备忘清单", kind: "文档", note: "保持极简，弱化工程字段" },
      { id: "r5", name: "交互稿记录", kind: "链接", note: "含长按方向入口" },
    ],
    emails: [
      {
        id: "e3",
        from: "design@team.ai",
        subject: "UI反馈：建议更干净信息层级",
        summary: "强调项目内容优先，减少看板式复杂表达。",
        importance: "高",
        time: "今天 09:18",
      },
      {
        id: "e4",
        from: "pm@team.ai",
        subject: "迭代目标确认",
        summary: "本轮先做可视化mock，不接真实数据。",
        importance: "中",
        time: "昨天 15:07",
      },
    ],
  },
  {
    id: "work-mail-router",
    name: "邮件自动归档引擎",
    category: "work",
    subtitle: "第三方邮箱接入与AI分配",
    status: "需关注",
    nextAction: "梳理分配规则与置信度阈值",
    steps: [
      { id: "s9", title: "定义分配规则版本v1", owner: "Alex", due: "03-12", done: false },
      { id: "s10", title: "设计待分配兜底流", owner: "Alex", due: "03-13", done: false },
    ],
    resources: [
      { id: "r6", name: "邮件字段映射表", kind: "文档", note: "发件人/质量/意图/上下文" },
    ],
    emails: [
      {
        id: "e5",
        from: "infra@vendor.com",
        subject: "OAuth 回调限制说明",
        summary: "生产环境需要白名单域名配置。",
        importance: "中",
        time: "昨天 11:40",
      },
    ],
  },
  {
    id: "study-english",
    name: "英语口语冲刺",
    category: "study",
    subtitle: "30天口语任务",
    status: "正常推进",
    nextAction: "今天完成 20 分钟跟读",
    steps: [
      { id: "s11", title: "每日跟读20分钟", owner: "我", due: "每天", done: false },
      { id: "s12", title: "每周录音复盘", owner: "我", due: "周六", done: false },
    ],
    resources: [
      { id: "r7", name: "跟读素材库", kind: "链接", note: "按难度分组" },
    ],
    emails: [
      {
        id: "e6",
        from: "noreply@learn.app",
        subject: "本周学习报告",
        summary: "发音准确率提升 6%，建议增加对话练习。",
        importance: "低",
        time: "周一 08:03",
      },
    ],
  },
  {
    id: "study-exam",
    name: "算法面试准备",
    category: "study",
    subtitle: "高频题与系统设计整理",
    status: "有阻塞",
    nextAction: "把薄弱点按主题重新分组",
    steps: [
      { id: "s13", title: "完成两道中等题", owner: "我", due: "今天", done: false },
      { id: "s14", title: "整理系统设计模板", owner: "我", due: "03-11", done: false },
    ],
    resources: [
      { id: "r8", name: "面试知识网络", kind: "文档", note: "需要补充缓存章节" },
    ],
    emails: [
      {
        id: "e7",
        from: "mentor@career.dev",
        subject: "下周模拟面试安排",
        summary: "建议先补齐图论与并发部分。",
        importance: "高",
        time: "今天 07:51",
      },
    ],
  },
];

export const projectsByCategory: Record<ProjectCategory, ProjectRecord[]> = {
  life: mockProjects.filter((item) => item.category === "life"),
  work: mockProjects.filter((item) => item.category === "work"),
  study: mockProjects.filter((item) => item.category === "study"),
};

export const getProjectById = (projectId: string) =>
  mockProjects.find((item) => item.id === projectId) ?? null;
