import React from 'react';
import { CommentBody } from './comment-body';

export function PendingFeedback({ preview }: { preview: any }) {
  if (!preview?.enabled) return null;
  return (
    <section className="portal-stack" aria-label="Pending feedback to publish">
      <h3>Pending feedback included in this decision</h3>
      <p>These drafts will be published along with the feedback you enter below.</p>
      {preview.drafts.length ? (
        preview.drafts.map((comment: any) => (
          <article className="portal-activity" key={comment.id}>
            <strong>{comment.authorEmail}</strong>
            <CommentBody body={comment.body} />
          </article>
        ))
      ) : (
        <p>No pending drafts.</p>
      )}
    </section>
  );
}

export function DeliveryWarning({ warning }: { warning: any }) {
  if (!warning) return null;
  return (
    <aside className="portal-activity portal-stack" role="alert">
      <strong>Delivery needs attention</strong>
      {warning.versionId && <small>Version {warning.versionId}</small>}
      <p>{warning.message}</p>
      <p>{warning.recovery}</p>
      {warning.submittedFeedback && (
        <details>
          <summary>Feedback from the saved decision</summary>
          <CommentBody body={warning.submittedFeedback} />
        </details>
      )}
    </aside>
  );
}

export function ReviewConversation({ thread }: { thread: any }) {
  return (
    <div className="portal-stack">
      <strong>{thread.thread?.subject || 'Developer conversation'}</strong>
      {thread.thread_note && <small>{thread.thread_note}</small>}
      {(thread.thread?.comments || []).map((comment: any) => (
        <article className="portal-activity" key={`ticket-${comment.id}`}>
          <strong>{comment.author?.name || 'Participant'} · Zendesk</strong>
          <small>{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}</small>
          <p className="portal-pre">{comment.body}</p>
          {comment.attachments?.length > 0 && (
            <small>{comment.attachments.length} attachments · Open the ticket to view them.</small>
          )}
        </article>
      ))}
      {thread.thread?.hasOlderComments && <small>Older comments are available in Zendesk.</small>}
      {(thread.review_comments || []).map((comment: any) => (
        <article className="portal-activity" key={`review-${comment.id}`}>
          <strong>
            {comment.authorEmail || 'Participant'} ·{' '}
            {comment.authorRole === 'creator' ? 'Developer reply' : 'Review feedback'}
          </strong>
          <small>
            {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
            {comment.parentId ? ' · Reply in review conversation' : ''}
          </small>
          <CommentBody body={comment.body} />
        </article>
      ))}
      {thread.review_comments_error && (
        <p role="alert">
          Review comments could not be loaded: {thread.review_comments_error.message}. Read them
          before making a decision.
        </p>
      )}
      {thread.review_comments_note && <small>{thread.review_comments_note}</small>}
      {!thread.thread?.comments?.length &&
        Array.isArray(thread.review_comments) &&
        !thread.review_comments.length && <p>No released review comments yet.</p>}
    </div>
  );
}
