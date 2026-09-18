import { Fragment, type ReactNode } from 'react';

/**
 * Deliberately tiny markdown renderer: enough for the formatting models
 * actually emit in chat (paragraphs, lists, bold, inline and fenced code).
 * Swap in a real markdown library if you need tables, links or images.
 */
export function Markdown({ text }: { text: string }) {
  return <div className="md">{blocks(text)}</div>;
}

function blocks(text: string): ReactNode[] {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let buffer: string[] = [];
  let mode: 'paragraph' | 'bullets' | 'numbers' | 'code' = 'paragraph';

  const flush = () => {
    if (buffer.length === 0) {
      return;
    }
    const key = `block-${out.length}`;
    if (mode === 'code') {
      out.push(
        <pre key={key}>
          <code>{buffer.join('\n')}</code>
        </pre>,
      );
    } else if (mode === 'bullets' || mode === 'numbers') {
      const items = buffer.map((item, index) => (
        <li key={index}>{inline(item)}</li>
      ));
      out.push(
        mode === 'bullets' ? (
          <ul key={key}>{items}</ul>
        ) : (
          <ol key={key}>{items}</ol>
        ),
      );
    } else {
      out.push(<p key={key}>{inline(buffer.join('\n'))}</p>);
    }
    buffer = [];
  };

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      const wasCode: boolean = mode === 'code';
      flush();
      mode = wasCode ? 'paragraph' : 'code';
      continue;
    }
    if (mode === 'code') {
      buffer.push(line);
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^\s*#{1,6}\s+(.*)$/.exec(line);

    if (line.trim() === '') {
      flush();
      mode = 'paragraph';
    } else if (heading) {
      flush();
      out.push(<h3 key={`block-${out.length}`}>{inline(heading[1])}</h3>);
    } else if (bullet) {
      if (mode !== 'bullets') {
        flush();
        mode = 'bullets';
      }
      buffer.push(bullet[1]);
    } else if (numbered) {
      if (mode !== 'numbers') {
        flush();
        mode = 'numbers';
      }
      buffer.push(numbered[1]);
    } else {
      if (mode !== 'paragraph') {
        flush();
        mode = 'paragraph';
      }
      buffer.push(line);
    }
  }

  flush();
  return out;
}

const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__)/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE_PATTERN).map((token, index) => {
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={index}>{token.slice(1, -1)}</code>;
    }
    if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      return <strong key={index}>{token.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{token}</Fragment>;
  });
}
