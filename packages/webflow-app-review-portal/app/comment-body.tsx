import React from 'react';
import { parseCommentBody, type Inline, type ListBlock } from '../lib/comment-format';

function inline(nodes: Inline[]): React.ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return node.text;
      case 'code':
        return <code key={i}>{node.text}</code>;
      case 'link':
        return (
          <a key={i} href={node.url} title={node.host} target="_blank" rel="noopener noreferrer nofollow">
            {inline(node.children)}
          </a>
        );
      case 'bold':
        return <strong key={i}>{inline(node.children)}</strong>;
      case 'italic':
        return <em key={i}>{inline(node.children)}</em>;
      default:
        return <s key={i}>{inline(node.children)}</s>;
    }
  });
}

function List({ block }: { block: ListBlock }) {
  const items = block.items.map((item, i) => (
    <li key={i} value={block.ordered && item.value !== null ? item.value : undefined}>
      <span className="portal-comment-text">{inline(item.children)}</span>
      {item.lists.map((nested, j) => (
        <List key={j} block={nested} />
      ))}
    </li>
  ));
  return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
}

/**
 * Review feedback or a review comment with its formatting. The text is parsed
 * into a tree and rendered as elements and text; it is never set as HTML.
 */
export function CommentBody({ body }: { body: string }) {
  return (
    <div className="portal-comment">
      {parseCommentBody(body).map((block, i) => {
        if (block.type === 'rule') return <hr key={i} />;
        if (block.type === 'list') return <List key={i} block={block} />;
        return (
          <p key={i} className={block.type === 'label' ? 'portal-comment-text portal-comment-label' : 'portal-comment-text'}>
            {inline(block.children)}
          </p>
        );
      })}
    </div>
  );
}
