import React from 'react';

/**
 * Renders admin-authored text. Supported syntax:
 *   # Heading        ## Sub heading        - bullet        blank line = paragraph break
 */
const LegalContent = ({ content, className = '' }) => {
  const lines = typeof content === 'string' ? content.split('\n') : [];
  const blocks = [];
  let list = null;

  const flushList = () => {
    if (list) {
      blocks.push({ type: 'ul', items: list });
      list = null;
    }
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) return flushList();
    if (line.startsWith('## ')) {
      flushList();
      blocks.push({ type: 'h3', text: line.slice(3) });
    } else if (line.startsWith('# ')) {
      flushList();
      blocks.push({ type: 'h2', text: line.slice(2) });
    } else if (/^[-*•]\s+/.test(line)) {
      list = list || [];
      list.push(line.replace(/^[-*•]\s+/, ''));
    } else {
      flushList();
      blocks.push({ type: 'p', text: line });
    }
  });
  flushList();

  return (
    <div className={`space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'h2') {
          return (
            <h4 key={i} className="pt-3 font-bold text-slate-900 text-sm sm:text-base border-t border-slate-100 first:border-t-0 first:pt-0">
              {b.text}
            </h4>
          );
        }
        if (b.type === 'h3') {
          return (
            <h5 key={i} className="pt-1.5 font-semibold text-slate-800 text-xs sm:text-sm">
              {b.text}
            </h5>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="space-y-1.5 my-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#005CA8] shrink-0" />
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i} className="text-xs sm:text-sm text-slate-600 leading-relaxed">{b.text}</p>;
      })}
    </div>
  );
};

export const formatUpdated = (page) =>
  page?.updatedAt
    ? new Date(page.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

export default LegalContent;
