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
    <div className={`space-y-3 text-sm text-gray-600 leading-relaxed ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'h2') return <h4 key={i} className="pt-2 font-bold text-textDark text-base">{b.text}</h4>;
        if (b.type === 'h3') return <h5 key={i} className="font-bold text-textDark">{b.text}</h5>;
        if (b.type === 'ul') {
          return (
            <ul key={i} className="space-y-1.5">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-surface shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
};

export const formatUpdated = (page) =>
  page?.updatedAt
    ? new Date(page.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

export default LegalContent;
