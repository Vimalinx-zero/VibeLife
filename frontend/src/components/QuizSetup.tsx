import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GlassCard from "./GlassCard";

const QuizSetup = ({ onStart }) => {
  const navigate = useNavigate();

  const Icons = {
    ArrowLeft: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
  };

  useEffect(() => {
    console.log('✅ QuizSetup 组件已渲染');
  }, []);

  const [selectedSubjects, setSelectedSubjects] = useState(['all']);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('all');
  const [questionType, setQuestionType] = useState('all');
  const [smartRecommend, setSmartRecommend] = useState(true);

  const SUBJECTS = [
    { id: 'all', name: '全部学科', icon: '📚', color: 'gray' },
    { id: 'physics', name: '物理', icon: '⚡', color: 'blue' },
    { id: 'math', name: '数学', icon: '📐', color: 'purple' },
    { id: 'biology', name: '生物', icon: '🧬', color: 'green' },
  ];

  const QUESTION_COUNTS = [
    { value: 5, label: '5题', desc: '约3分钟', icon: '🎯' },
    { value: 10, label: '10题', desc: '约6分钟', icon: '🔥' },
    { value: 20, label: '20题', desc: '约12分钟', icon: '💪' },
    { value: -1, label: '无限', desc: '自主控制', icon: '♾️' },
  ];

  const DIFFICULTIES = [
    { value: 'all', label: '全部', desc: '混合难度', color: 'gray' },
    { value: 'easy', label: '基础', desc: '夯实基础', color: 'green' },
    { value: 'medium', label: '进阶', desc: '稳步提升', color: 'yellow' },
    { value: 'hard', label: '挑战', desc: '突破难点', color: 'red' },
  ];

  const QUESTION_TYPES = [
    { value: 'all', label: '全部', desc: '单选+多选', icon: '📝' },
    { value: 'single', label: '单选题', desc: '快速练习', icon: '○' },
    { value: 'multiple', label: '多选题', desc: '深度思考', icon: '☑️' },
  ];

  // 处理学科选择
  const toggleSubject = (subjectId) => {
    if (subjectId === 'all') {
      setSelectedSubjects(['all']);
    } else {
      const hasAll = selectedSubjects.includes('all');
      const newSelection = hasAll
        ? [subjectId]
        : selectedSubjects.includes(subjectId)
          ? selectedSubjects.filter(s => s !== subjectId)
          : [...selectedSubjects, subjectId];

      if (newSelection.length === 0) {
        setSelectedSubjects(['all']);
      } else {
        setSelectedSubjects(newSelection);
      }
    }
  };

  const handleStart = () => {
    onStart({
      subjects: selectedSubjects,
      questionCount,
      difficulty,
      questionType,
      smartRecommend,
    });
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 overflow-y-auto relative">
      {/* 返回主页按钮 */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-sm font-bold text-sm hover:scale-105 transition-transform text-slate-600 dark:text-slate-300"
      >
        <Icons.ArrowLeft className="w-4 h-4" />
        <span>返回主页</span>
      </button>

      <div className="w-full max-w-5xl my-auto">
        {/* 标题区 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-1">
            错题重练
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            从错题本中选题，攻克薄弱环节
          </p>
        </motion.div>

        {/* 主设置卡片 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-5">
            {/* 1. 学科选择 */}
            <div className="mb-5">
              <h3 className="text-base font-bold dark:text-white text-gray-900 mb-3 flex items-center gap-2">
                <span>📚</span>
                <span>选择学科</span>
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {SUBJECTS.map((subject) => {
                  const isSelected = selectedSubjects.includes(subject.id) ||
                    (subject.id === 'all' && selectedSubjects.includes('all'));
                  const isAllSelected = subject.id === 'all' && selectedSubjects.includes('all');
                  const hasOtherSelection = selectedSubjects.some(s => s !== 'all');

                  return (
                    <button
                      key={subject.id}
                      onClick={() => toggleSubject(subject.id)}
                      disabled={isAllSelected && subject.id !== 'all'}
                      className={`
                        p-4 rounded-xl font-bold transition-all duration-200
                        flex flex-col items-center gap-1
                        ${isSelected && !isAllSelected
                          ? `bg-${subject.color}-500 text-white shadow-lg shadow-${subject.color}-500/30 scale-105`
                          : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10'
                        }
                        ${isAllSelected && subject.id !== 'all' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
                        border-2 ${isSelected ? `border-${subject.color}-500` : 'border-gray-200 dark:border-white/10'}
                      `}
                    >
                      <span className="text-2xl">{subject.icon}</span>
                      <span className="text-xs">{subject.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. 题目数量 */}
            <div className="mb-5">
              <h3 className="text-base font-bold dark:text-white text-gray-900 mb-3 flex items-center gap-2">
                <span>🎯</span>
                <span>题目数量</span>
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {QUESTION_COUNTS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuestionCount(option.value)}
                    className={`
                      p-4 rounded-xl font-bold transition-all duration-200
                      flex flex-col items-center gap-1
                      ${questionCount === option.value
                        ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                        : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10'
                      }
                      border-2 ${questionCount === option.value ? 'border-blue-500' : 'border-gray-200 dark:border-white/10'}
                    `}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <span className="text-sm">{option.label}</span>
                    <span className="text-[10px] opacity-70">{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 难度 & 题型（并排） */}
            <div className="grid grid-cols-2 gap-5 mb-5">
              {/* 难度 */}
              <div>
                <h3 className="text-base font-bold dark:text-white text-gray-900 mb-3 flex items-center gap-2">
                  <span>⚖️</span>
                  <span>难度</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTIES.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDifficulty(option.value)}
                      className={`
                        p-3 rounded-lg font-medium transition-all duration-200
                        ${difficulty === option.value
                          ? `bg-${option.color}-500/20 text-${option.color}-600 dark:text-${option.color}-400 border-${option.color}-500`
                          : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10'
                        }
                        border-2 text-left
                      `}
                    >
                      <div className="text-xs font-bold mb-0.5">{option.label}</div>
                      <div className="text-[10px] opacity-60">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 题型 */}
              <div>
                <h3 className="text-base font-bold dark:text-white text-gray-900 mb-3 flex items-center gap-2">
                  <span>📝</span>
                  <span>题型</span>
                </h3>
                <div className="space-y-2">
                  {QUESTION_TYPES.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setQuestionType(option.value)}
                      className={`
                        w-full p-3 rounded-lg font-medium transition-all duration-200
                        flex items-center gap-2
                        ${questionType === option.value
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                          : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10'
                        }
                        border-2 ${questionType === option.value ? 'border-orange-500' : 'border-gray-200 dark:border-white/10'}
                      `}
                    >
                      <span className="text-xl">{option.icon}</span>
                      <div className="text-left">
                        <div className="text-xs font-bold">{option.label}</div>
                        <div className="text-[10px] opacity-70">{option.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. 智能推荐开关 */}
            <div className="mb-5">
              <div className={`
                p-4 rounded-xl border-2 transition-all duration-200
                flex items-center justify-between
                ${smartRecommend
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-500/20'
                  : 'bg-white/50 dark:bg-white/5 border-gray-200 dark:border-white/10'
                }
              `}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">智能推荐模式</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      根据错题本和历史表现推荐最适合的题目
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSmartRecommend(!smartRecommend)}
                  className={`
                    relative w-14 h-8 rounded-full transition-all duration-300
                    ${smartRecommend ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
                  `}
                >
                  <motion.div
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                    animate={{ left: smartRecommend ? 28 : 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>

            {/* 开始按钮 */}
            <motion.button
              onClick={handleStart}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl font-bold text-base shadow-xl shadow-red-500/30 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg">🔄</span>
              <span>开始重练错题</span>
            </motion.button>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default QuizSetup;
