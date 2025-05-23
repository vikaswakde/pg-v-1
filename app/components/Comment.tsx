"use client";

import { useState } from "react";
import Image from "next/image";
import CommentForm from "./CommentForm";
import CommentThread from "./CommentThread";

interface CommentProps {
  comment: {
    id: number;
    content: string;
    userId: string | null;
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
  };
  postId: number;
  isLoggedIn: boolean;
  currentUserId?: string;
  replies?: CommentProps["comment"][];
}

export default function Comment({
  comment,
  postId,
  isLoggedIn,
  currentUserId,
  replies = [],
}: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showThreadView, setShowThreadView] = useState(false);

  const isMainComment = comment.parentCommentId === 0;
  const isOwnComment = currentUserId === comment.userId;
  const isAgent = comment.isAgentReply;

  // Get the name, username and avatar based on whether it's a user or agent
  const name = isAgent
    ? comment.agent?.name || "AI"
    : comment.user?.name || "Unknown";
  const username = isAgent
    ? comment.agent?.username || ""
    : comment.user?.username || "";
  const avatar = isAgent ? comment.agent?.avatar : comment.user?.image;

  return (
    <div className={`${isMainComment ? "" : "ml-8 mt-3"}`}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {isAgent ? (
            avatar ? (
              <Image
                src={avatar}
                alt={name}
                width={32}
                height={32}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">AI</span>
              </div>
            )
          ) : comment.user?.image ? (
            <Image
              src={comment.user.image}
              alt={comment.user.name}
              width={32}
              height={32}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-500 text-xs font-bold">
                {comment.user?.name?.charAt(0) || "?"}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm">{name}</span>
            <span className="text-gray-500 text-xs">
              {username ? `@${username}` : ""}
            </span>
            <span className="text-gray-400 text-xs">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>

          <p className="text-gray-800 mt-1 text-sm">{comment.content}</p>

          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            {isLoggedIn && !isOwnComment && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="hover:text-blue-600"
              >
                {showReplyForm ? "Cancel" : "Reply"}
              </button>
            )}

            {isMainComment && replies.length > 0 && (
              <button
                onClick={() => setShowThreadView(true)}
                className="hover:text-blue-600"
              >
                View conversation ({replies.length})
              </button>
            )}
          </div>

          {showReplyForm && (
            <div className="mt-3">
              <CommentForm
                postId={postId}
                parentCommentId={comment.id}
                onSuccess={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {/* Show the thread view modal when enabled */}
          {showThreadView && (
            <CommentThread
              commentId={comment.id}
              postId={postId}
              initialComment={comment}
              onClose={() => setShowThreadView(false)}
            />
          )}

          {/* Render replies */}
          {replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {replies.map((reply) => (
                <div key={reply.id} className="border-l-2 border-gray-100 pl-3">
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {reply.isAgentReply ? (
                        reply.agent?.avatar ? (
                          <Image
                            src={reply.agent.avatar}
                            alt={reply.agent.name}
                            width={24}
                            height={24}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-bold">
                              AI
                            </span>
                          </div>
                        )
                      ) : reply.user?.image ? (
                        <Image
                          src={reply.user.image}
                          alt={reply.user.name}
                          width={24}
                          height={24}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-500 text-xs font-bold">
                            {reply.user?.name?.charAt(0) || "?"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-semibold text-xs">
                          {reply.isAgentReply
                            ? reply.agent?.name || "AI"
                            : reply.user?.name || "Unknown"}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {reply.isAgentReply
                            ? reply.agent?.username
                              ? `@${reply.agent.username}`
                              : ""
                            : reply.user?.username
                            ? `@${reply.user.username}`
                            : ""}
                        </span>
                      </div>
                      <p className="text-gray-800 mt-1 text-xs">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
