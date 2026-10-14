"use client";

import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/ui/badges";
import { Section } from "@/components/ui/page-header";
import { AUTHOR_INDEX } from "@/lib/data/authors";
import type { DeckComment } from "@/lib/decks/types";
import { formatDate, formatNumber, pluralize } from "@/lib/format";
import { addLocalComment, commentVotesStore, useCommentVote, useHandle, useLocalComments } from "@/lib/storage/community";
import { useLocalStore } from "@/lib/storage/local-store";
import {
  ANONYMOUS_NAME,
  COMMENT_MAX_LENGTH,
  COMMENT_SORT_LABELS,
  buildCommentTree,
  capThreadDepth,
  commentAuthorCredit,
  commentDraftError,
  countComments,
  mergeComments,
  type CommentNode,
  type CommentSort,
} from "./comments";
import { DownIcon, UpIcon } from "./icons";
import { BUTTON_GHOST_SM, BUTTON_PRIMARY, FIELD, FIELD_LABEL, FOCUS_RING, SEGMENTED, TEXTAREA, TEXT_LINK, segmentClass } from "./styles";

interface ThreadContext {
  deckId: string;
  deckAuthorHandle: string;
  profileHandles: ReadonlySet<string>;
  localIds: ReadonlySet<string>;
  handle: string;
  replyingTo: string | null;
  focusId: string | null;
  setReplyingTo: (id: string | null) => void;
  onPosted: (comment: DeckComment, kind: "comment" | "reply") => void;
}

function CommentVotes({ comment }: { comment: DeckComment }) {
  const [vote, toggle] = useCommentVote(comment.id);
  const button = (pressed: boolean) =>
    cx(
      "grid h-7 w-7 place-items-center rounded-md transition",
      FOCUS_RING,
      pressed ? "bg-chakra-500 text-shadow-950" : "text-ash-400 hover:bg-shadow-700 hover:text-white",
    );
  return (
    <div role="group" aria-label={`Votes on ${comment.author}'s comment`} className="flex items-center gap-1">
      <button type="button" aria-pressed={vote === 1} aria-label="Upvote" onClick={() => toggle(1)} className={button(vote === 1)}>
        <UpIcon className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-6 text-center text-xs font-semibold tabular-nums text-ash-100">
        {formatNumber(comment.votes + vote)}
        <span className="sr-only"> votes</span>
      </span>
      <button type="button" aria-pressed={vote === -1} aria-label="Downvote" onClick={() => toggle(-1)} className={button(vote === -1)}>
        <DownIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Draft body + submit; the display name comes from the shared handle field. */
function CommentForm({
  label,
  submitLabel,
  autoFocus = false,
  onSubmit,
  onCancel,
}: {
  label: string;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const [body, setBody] = useState("");
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const error = commentDraftError(body);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (error) {
      textareaRef.current?.focus();
      return;
    }
    onSubmit(body);
    setBody("");
    setTouched(false);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor={`${id}-body`} className={FIELD_LABEL}>
        {label}
      </label>
      <textarea
        ref={textareaRef}
        id={`${id}-body`}
        rows={3}
        value={body}
        maxLength={COMMENT_MAX_LENGTH}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && onCancel) {
            event.preventDefault();
            onCancel();
          }
        }}
        aria-invalid={touched && error ? true : undefined}
        aria-describedby={touched && error ? `${id}-error` : undefined}
        className={TEXTAREA}
      />
      {touched && error && (
        <p id={`${id}-error`} className="text-xs text-ash-200">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className={BUTTON_PRIMARY}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={BUTTON_GHOST_SM}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function CommentItem({ node, ctx }: { node: CommentNode; ctx: ThreadContext }) {
  const { comment } = node;
  const articleRef = useRef<HTMLElement>(null);
  const replyButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const replying = ctx.replyingTo === comment.id;
  const isLocal = ctx.localIds.has(comment.id);
  const { href, deckAuthor: isAuthor } = commentAuthorCredit(comment.author, {
    local: isLocal,
    deckAuthorHandle: ctx.deckAuthorHandle,
    profileHandles: ctx.profileHandles,
  });
  // Replies past the indentation cap sit beside their parent, so name who they answer.
  const flattened = node.depth > node.displayDepth && node.replyTo;

  useEffect(() => {
    if (ctx.focusId !== comment.id) return;
    articleRef.current?.focus();
    articleRef.current?.scrollIntoView({ block: "nearest" });
  }, [ctx.focusId, comment.id]);

  const closeReply = () => {
    ctx.setReplyingTo(null);
    replyButtonRef.current?.focus();
  };

  return (
    <li>
      <article
        ref={articleRef}
        tabIndex={-1}
        aria-labelledby={titleId}
        className={cx(
          "rounded-lg border bg-shadow-900 px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 sm:px-4",
          ctx.focusId === comment.id ? "border-chakra-600" : "border-shadow-700",
        )}
      >
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <h3 id={titleId} className="text-sm font-semibold text-white">
            {href ? (
              <Link href={href} className={TEXT_LINK}>
                {comment.author}
              </Link>
            ) : (
              comment.author
            )}
          </h3>
          {isAuthor && <span className="rounded border border-chakra-600 px-1.5 py-px font-semibold text-chakra-300">Deck author</span>}
          {isLocal && <span className="rounded border border-shadow-500 px-1.5 py-px text-ash-300">posted from this browser</span>}
          <time dateTime={comment.createdAt} className="text-ash-500">
            {formatDate(comment.createdAt)}
          </time>
        </header>
        {flattened && <p className="mt-1 text-xs text-ash-500">Replying to {node.replyTo}</p>}
        <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-ash-200">{comment.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <CommentVotes comment={comment} />
          <button
            ref={replyButtonRef}
            type="button"
            aria-expanded={replying}
            onClick={() => ctx.setReplyingTo(replying ? null : comment.id)}
            className={cx("rounded-sm text-xs font-semibold text-ash-400 hover:text-chakra-300", FOCUS_RING)}
          >
            Reply
          </button>
        </div>
        {replying && (
          <div className="mt-3 border-t border-shadow-700 pt-3">
            <CommentForm
              label={`Reply to ${comment.author} as ${ctx.handle.trim() || ANONYMOUS_NAME}`}
              submitLabel="Post reply"
              autoFocus
              onCancel={closeReply}
              onSubmit={(body) => {
                const posted = addLocalComment({ deckId: ctx.deckId, parentId: comment.id, author: ctx.handle, body });
                ctx.setReplyingTo(null);
                ctx.onPosted(posted, "reply");
              }}
            />
          </div>
        )}
      </article>
      {node.children.length > 0 && (
        <ul aria-label={`Replies to ${comment.author}`} className="mt-2 flex flex-col gap-2 border-l border-shadow-600 pl-3 sm:pl-4">
          {node.children.map((child) => (
            <CommentItem key={child.comment.id} node={child} ctx={ctx} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Community thread: seed comments plus this browser's, nested (indentation capped at three
 * levels), sortable by Top or New, with per-comment votes and replies kept in local storage.
 */
export function CommentThread({
  deckId,
  deckAuthorHandle,
  seedComments,
}: {
  deckId: string;
  deckAuthorHandle: string;
  seedComments: DeckComment[];
}) {
  const id = useId();
  const [sort, setSort] = useState<CommentSort>("top");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [handle, setHandle] = useHandle();
  const [localVotes] = useLocalStore(commentVotesStore);
  const local = useLocalComments(deckId);

  const tree = useMemo(
    () => capThreadDepth(buildCommentTree(mergeComments(seedComments, local), { sort, localVotes })),
    [seedComments, local, sort, localVotes],
  );
  const total = countComments(tree);
  const localIds = useMemo(() => new Set(local.map((comment) => comment.id)), [local]);
  const profileHandles = useMemo(() => new Set([deckAuthorHandle, ...AUTHOR_INDEX.keys()]), [deckAuthorHandle]);

  const onPosted = (comment: DeckComment, kind: "comment" | "reply") => {
    setFocusId(comment.id);
    setStatus(kind === "reply" ? "Reply posted from this browser." : "Comment posted from this browser.");
  };

  const ctx: ThreadContext = { deckId, deckAuthorHandle, profileHandles, localIds, handle, replyingTo, focusId, setReplyingTo, onPosted };

  return (
    <Section
      id="comments"
      title={
        <>
          Comments <span className="text-base font-medium tabular-nums text-ash-400">({formatNumber(total)})</span>
        </>
      }
      description="Votes and comments you add are stored in this browser only; other visitors will not see them."
      actions={
        <div role="group" aria-label="Sort comments" className={SEGMENTED}>
          {(Object.keys(COMMENT_SORT_LABELS) as CommentSort[]).map((option) => (
            <button key={option} type="button" aria-pressed={sort === option} onClick={() => setSort(option)} className={segmentClass(sort === option)}>
              {COMMENT_SORT_LABELS[option]}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-lg border border-shadow-700 bg-shadow-900 p-3 sm:p-4">
          <div className="flex max-w-xs flex-col gap-1">
            <label htmlFor={`${id}-handle`} className={FIELD_LABEL}>
              Display name
            </label>
            <input
              id={`${id}-handle`}
              type="text"
              value={handle}
              maxLength={40}
              autoComplete="nickname"
              placeholder={ANONYMOUS_NAME}
              onChange={(event) => setHandle(event.target.value)}
              className={FIELD}
            />
          </div>
          <CommentForm
            label="Add a comment"
            submitLabel="Post comment"
            onSubmit={(body) => onPosted(addLocalComment({ deckId, parentId: null, author: handle, body }), "comment")}
          />
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>

        {tree.length === 0 ? (
          <EmptyState title="No comments yet">Start the discussion: questions about card choices and matchups are welcome.</EmptyState>
        ) : (
          <ul aria-label={`${pluralize(total, "comment")}, sorted by ${COMMENT_SORT_LABELS[sort].toLowerCase()}`} className="flex flex-col gap-3">
            {tree.map((node) => (
              <CommentItem key={node.comment.id} node={node} ctx={ctx} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
