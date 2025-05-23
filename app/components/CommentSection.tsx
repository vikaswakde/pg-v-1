"use client";

import { useState, useEffect } from "react";
import Comment from "./Comment";
import CommentForm from "./CommentForm";
import { useUser } from "@clerk/nextjs";

interface Comment {
  id: number;
  content: string;
  userId: string | null;
  postId: number;
  isAgentReply: boolean;
  parentCommentId: number;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
  agent?: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
  };
}

interface CommentSectionProps {
  postId: number;
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const { isSignedIn, user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/comments?postId=${postId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const data = await response.json();
      setComments(data.comments);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError("Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  // Organize comments into main comments and replies
  const mainComments = comments.filter(
    (comment) => comment.parentCommentId === 0
  );

  // Create a mapping of parent comment IDs to their replies
  const repliesByParentId = comments.reduce((acc, comment) => {
    if (comment.parentCommentId !== 0) {
      if (!acc[comment.parentCommentId]) {
        acc[comment.parentCommentId] = [];
      }
      acc[comment.parentCommentId].push(comment);
    }
    return acc;
  }, {} as Record<number, Comment[]>);

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Comments</h3>

      {isSignedIn && (
        <div className="mb-6">
          <CommentForm postId={postId} onSuccess={fetchComments} />
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Loading comments...</p>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-red-500">{error}</p>
        </div>
      ) : mainComments.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">
            No comments yet. Be the first to comment!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mainComments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              postId={postId}
              isLoggedIn={!!isSignedIn}
              currentUserId={user?.id}
              replies={repliesByParentId[comment.id] || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
