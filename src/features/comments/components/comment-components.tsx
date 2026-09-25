"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/fields";
import { ReportButton } from "@/features/reports/components/report-button";
import { createCommentAction, deleteCommentAction, updateCommentAction } from "../actions";

type CommentView = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  firstName: string;
  lastName: string;
  image: string | null;
};

export function CommentForm({ eventId }: { eventId: string }) {
  const t = useTranslations("comments");
  const te = useTranslations("errors");
  const router = useRouter();
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!content.trim()) return;
        startTransition(async () => {
          const res = await createCommentAction({ eventId, content });
          if (!res.ok) return void toast.error(te(res.error));
          setContent("");
          toast.success(t("posted"));
          router.refresh();
        });
      }}
    >
      <label htmlFor="new-comment" className="sr-only">{t("label")}</label>
      <Textarea id="new-comment" rows={3} maxLength={1000} placeholder={t("placeholder")} value={content} onChange={(e) => setContent(e.target.value)} />
      <Button type="submit" loading={pending} disabled={!content.trim()}>{t("post")}</Button>
    </form>
  );
}

export function CommentItem({ comment, currentUserId, isAdmin }: { comment: CommentView; currentUserId: string | null; isAdmin: boolean }) {
  const t = useTranslations("comments");
  const te = useTranslations("errors");
  const format = useFormatter();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [pending, startTransition] = useTransition();
  const isOwner = currentUserId === comment.userId;
  const name = `${comment.firstName} ${comment.lastName}`.trim();

  const save = () =>
    startTransition(async () => {
      const res = await updateCommentAction({ id: comment.id, content: draft });
      if (!res.ok) return void toast.error(te(res.error));
      setEditing(false);
      toast.success(t("updated"));
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      if (!window.confirm(t("confirmDelete"))) return;
      const res = await deleteCommentAction(comment.id);
      if (!res.ok) return void toast.error(te(res.error));
      toast.success(t("deleted"));
      router.refresh();
    });

  return (
    <article className="flex gap-3">
      <Avatar src={comment.image} firstName={comment.firstName} lastName={comment.lastName} alt={name} size={36} />
      <div className="min-w-0 flex-1 rounded-2xl bg-gray-50 px-4 py-3">
        <header className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className="font-semibold">{name}</span>
          <time dateTime={new Date(comment.createdAt).toISOString()} className="text-xs text-gray-500">{format.relativeTime(new Date(comment.createdAt))}</time>
          {new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000 && <span className="text-xs text-gray-400">{t("edited")}</span>}
        </header>
        {editing ? (
          <div className="mt-2 space-y-2">
            <label htmlFor={`edit-${comment.id}`} className="sr-only">{t("edit")}</label>
            <Textarea id={`edit-${comment.id}`} rows={3} maxLength={1000} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" loading={pending} onClick={save}>{t("save")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t("cancel")}</Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-800">{comment.content}</p>
        )}
        <div className="mt-2 flex gap-3 text-xs">
          {isOwner && !editing && <button type="button" className="text-gray-500 hover:text-gray-900" onClick={() => setEditing(true)}>{t("edit")}</button>}
          {(isOwner || isAdmin) && <button type="button" className="text-gray-500 hover:text-red-600" onClick={remove} disabled={pending}>{t("delete")}</button>}
          {currentUserId && !isOwner && <ReportButton targetType="comment" targetId={comment.id} compact />}
        </div>
      </div>
    </article>
  );
}
