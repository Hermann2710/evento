import { z } from "zod";

export const commentContent = z.string().trim().min(1, "required").max(1000, "too_long");

export const createCommentSchema = z.object({ eventId: z.uuid("invalid"), content: commentContent });
export const updateCommentSchema = z.object({ id: z.uuid("invalid"), content: commentContent });

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
