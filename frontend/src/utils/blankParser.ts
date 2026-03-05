// frontend/src/utils/blankParser.ts
// 多空填空解析工具函数

export interface BlankInfo {
  index: number;
  placeholder: string;
}

export interface ParsedStemResult {
  parsedStem: string;
  blankCount: number;
  blanks: BlankInfo[];
}

export interface ValidationResult {
  blankIndex: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
}

export interface ValidateResult {
  allCorrect: boolean;
  results: ValidationResult[];
}

/**
 * 检测题干中的空格标记并解析
 * @param stem - 题目题干
 * @returns { parsedStem, blankCount, blanks }
 */
export function parseMultiBlankStem(stem: string): ParsedStemResult {
  const BLANK_PATTERNS = [
    /_{3,}/g,           // Matches: ____, _____, ______
    /\[blank\]/gi,      // Matches: [blank], [Blank], [BLANK]
    /\[\s*\]/g,         // Matches: [] (empty brackets)
    /___\(\d+\)___/g    // Matches: __(1)__, __(2)__ (numbered blanks)
  ];

  const blanks: BlankInfo[] = [];
  let blankCount = 0;

  // 替换所有空格标记为占位符
  const parsedStem = stem.replace(/_{3,}|\[blank\]|\[\s*\]/gi, (match) => {
    blanks.push({ index: blankCount, placeholder: match });
    return `{{BLANK_${blankCount++}}}`;
  });

  return {
    parsedStem,      // 带占位符的题干
    blankCount,      // 空格数量
    blanks          // 空格信息数组
  };
}

/**
 * 验证多空填空答案
 * @param userAnswers - 用户答案（单个字符串或数组）
 * @param correctAnswerString - 正确答案（逗号分隔的字符串）
 * @returns { allCorrect, results }
 */
export function validateMultiBlankAnswer(
  userAnswers: string | string[],
  correctAnswerString: string
): ValidateResult {
  // 后端存储的是逗号分隔的答案
  const correctAnswers = correctAnswerString.split(',').map((a: string) => a.trim().toLowerCase());
  const normalizedUser = Array.isArray(userAnswers) ? userAnswers : [userAnswers];

  // 验证每个空
  const results = normalizedUser.map((ans, idx) => ({
    blankIndex: idx,
    isCorrect: normalizeAnswer(ans) === normalizeAnswer(correctAnswers[idx] || ''),
    userAnswer: ans,
    correctAnswer: correctAnswers[idx] || ''
  }));

  return {
    allCorrect: results.every(r => r.isCorrect),
    results
  };
}

/**
 * 标准化答案（用于比较）
 * @param answer - 原始答案
 * @returns 标准化后的答案
 */
function normalizeAnswer(answer: string): string {
  if (!answer) return '';
  return String(answer).toLowerCase()
    .replace(/\s+/g, '')           // 移除所有空格
    .replace(/[，。；]/g, ',;');   // 中文标点转为英文
}
