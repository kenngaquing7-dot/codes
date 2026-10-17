import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse markdown into sections
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';
  let codeBlockCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block check
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        const codeText = codeBuffer.join('\n');
        const currentIdx = codeBlockCounter++;
        elements.push(
          <div key={`code-${i}`} className="my-3 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900/90 text-xs">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/80 border-b border-slate-700/80 text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-300">
                <Terminal className="w-3.5 h-3.5" />
                {codeLang || 'code'}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(codeText, currentIdx)}
                className="flex items-center gap-1 hover:text-slate-200 transition-colors cursor-pointer text-[11px] py-0.5 px-1.5 rounded hover:bg-slate-700/50"
              >
                {copiedIndex === currentIdx ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto font-mono text-slate-200 leading-relaxed text-xs">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-base font-bold text-indigo-300 mt-4 mb-2 flex items-center gap-2">
          {renderInlineFormatting(line.slice(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-lg font-bold text-white mt-5 mb-2.5 border-b border-slate-800 pb-1.5">
          {renderInlineFormatting(line.slice(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-xl font-extrabold text-white mt-6 mb-3">
          {renderInlineFormatting(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Callout box / blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <div
          key={`quote-${i}`}
          className="my-2.5 pl-3.5 py-1.5 border-l-3 border-indigo-400 bg-indigo-950/30 rounded-r-md text-slate-300 text-sm italic"
        >
          {renderInlineFormatting(line.slice(2))}
        </div>
      );
      continue;
    }

    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const indent = line.search(/\S/);
      const bulletContent = line.trim().slice(2);
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2.5 my-1 text-sm text-slate-200 leading-relaxed" style={{ marginLeft: `${indent * 6}px` }}>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
          <div className="flex-1">{renderInlineFormatting(bulletContent)}</div>
        </div>
      );
      continue;
    }

    // Numbered list
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5 text-sm text-slate-200 leading-relaxed">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-indigo-300 font-semibold text-xs shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <div className="flex-1">{renderInlineFormatting(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1.5 text-sm text-slate-200 leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  return <div className="space-y-1 text-slate-200">{elements}</div>;
};

// Inline formatter for bold, italic, code tags
function renderInlineFormatting(text: string): React.ReactNode {
  // Split on bold, inline code, italics
  // Simple token parser
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Bold with **
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/);
    // Inline code with `
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/);

    if (boldMatch && (!codeMatch || boldMatch[1].length <= codeMatch[1].length)) {
      if (boldMatch[1]) {
        parts.push(renderItalic(boldMatch[1], keyIdx++));
      }
      parts.push(
        <strong key={`bold-${keyIdx++}`} className="font-semibold text-white">
          {boldMatch[2]}
        </strong>
      );
      remaining = boldMatch[3];
    } else if (codeMatch) {
      if (codeMatch[1]) {
        parts.push(renderItalic(codeMatch[1], keyIdx++));
      }
      parts.push(
        <code
          key={`code-in-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-indigo-300 text-xs"
        >
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
    } else {
      parts.push(renderItalic(remaining, keyIdx++));
      break;
    }
  }

  return <>{parts}</>;
}

function renderItalic(text: string, baseKey: number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let idx = 0;

  while (remaining.length > 0) {
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)$/);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(
        <em key={`em-${baseKey}-${idx++}`} className="italic text-slate-300">
          {italicMatch[2]}
        </em>
      );
      remaining = italicMatch[3];
    } else {
      parts.push(remaining);
      break;
    }
  }

  return <React.Fragment key={`frag-${baseKey}`}>{parts}</React.Fragment>;
}
