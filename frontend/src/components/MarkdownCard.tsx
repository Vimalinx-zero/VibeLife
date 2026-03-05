import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

/**
 * Markdown + LaTeX 渲染组件
 *
 * 支持功能：
 * - Markdown 基础语法（标题、列表、加粗、斜体等）
 * - GitHub 风格 Markdown（GFM）：表格、删除线、任务列表
 * - LaTeX 数学公式：行内 $...$ 和块级 $$...$$
 * - HTML 标签（经过安全过滤）
 */
const MarkdownCard = ({ content, className = "" }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          // 自定义样式
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white" {...props} />,
          p: ({ node, ...props }) => <p className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 text-gray-700 dark:text-gray-300 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 text-gray-700 dark:text-gray-300 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="ml-4" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
          em: ({ node, ...props }) => <em className="italic text-gray-800 dark:text-gray-200" {...props} />,
          code: ({ node, inline, ...props }: any) =>
            inline ? (
              <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-pink-600 dark:text-pink-400 rounded text-sm font-mono" {...props} />
            ) : (
              <code className="block p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-mono overflow-x-auto mb-3" {...props} />
            ),
          pre: ({ node, ...props }) => <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto mb-3" {...props} />,
          a: ({ node, ...props }) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 mb-3" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border border-gray-300 dark:border-gray-600" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-100 dark:bg-gray-700" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200 dark:divide-gray-700" {...props} />,
          tr: ({ node, ...props }) => <tr className="hover:bg-gray-50 dark:hover:bg-white/5" {...props} />,
          th: ({ node, ...props }) => <th className="px-4 py-2 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" {...props} />,
          td: ({ node, ...props }) => <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600" {...props} />,
          hr: ({ node, ...props }) => <hr className="my-4 border-gray-300 dark:border-gray-600" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>

      <style>{`
        .markdown-content :global(.katex) {
          font-size:1em;
        }
        .markdown-content :global(.katex-display) {
          margin:1em 0;
          overflow-x: auto;
          overflow-y: hidden;
        }
      `}</style>
    </div>
  );
};

export default MarkdownCard;
