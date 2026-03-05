// #(注释) frontend/src/utils/mistakeTree.js
// #(注释) 新建工具函数：将扁平的错题数据转化为"科目/错误类型"的虚拟文件树

export interface MistakeData {
  id: number;
  subject?: string;
  wrong_step_stem?: string;
  last_error_time?: string;
  [key: string]: any; // Index signature for additional properties
}

export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parent_id?: string;
  children?: TreeNode[];
  date?: string;
  data?: MistakeData;
}

export interface MistakeTreeResult {
  root: TreeNode;
  subjectMap: Record<string, TreeNode>;
}

export const buildMistakeTree = (mistakes: MistakeData[]): MistakeTreeResult => {
    // 1. 初始化根目录
    const root: TreeNode = {
        id: 'root',
        name: 'Mistake Vault',
        type: 'folder',
        children: [] // 存放一级目录（科目）
    };

    const subjectMap: Record<string, TreeNode> = {};

    mistakes.forEach((mistake: MistakeData) => {
        // --- 第一级归档：按科目 (Subject) ---
        const subject = mistake.subject || 'Uncategorized';

        if (!subjectMap[subject]) {
            subjectMap[subject] = {
                id: `folder_${subject}`,
                name: subject,
                type: 'folder',
                parent_id: 'root',
                children: [] // 存放二级目录（具体错题文件）
            };
            root.children!.push(subjectMap[subject]);
        }

        // --- 第二级归档：创建虚拟文件 (File) ---
        // 我们把每一道错题包装成一个"文件"
        const mistakeFile: TreeNode = {
            id: String(mistake.id), // 使用错题的 ID
            name: `${mistake.wrong_step_stem?.substring(0, 20)}...` || 'Unknown Question', // 文件名取题干前20字
            type: 'file',
            parent_id: `folder_${subject}`,
            date: mistake.last_error_time,

            // 携带完整的错题数据，方便点击时读取
            data: mistake
        };

        subjectMap[subject].children!.push(mistakeFile);
    });

    return { root, subjectMap };
};