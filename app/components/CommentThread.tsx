"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import CommentForm from "./CommentForm";

interface Agent {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
}

interface User {
  id: string;
  name: string;
  username: string;
  image: string | null;
}

interface Reply {
  id: number;
  content: string;
  userId: string | null;
  postId: number;
  isAgentReply: boolean;
  parentCommentId: number;
  createdAt: Date;
  user?: User | null;
  agent?: Agent;
}

interface CommentThreadProps {
  commentId: number;
  postId: number;
  initialComment: {
    id: number;
    content: string;
    userId: string | null;
    isAgentReply: boolean;
    parentCommentId: number;
    createdAt: Date;
    user?: User | null;
    agent?: Agent;
  };
  onClose: () => void;
}

export default function CommentThread({
  commentId,
  postId,
  initialComment,
  onClose,
}: CommentThreadProps) {
  const { isSignedIn } = useUser();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReplies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/comments/${commentId}/replies`);

      if (!response.ok) {
        throw new Error("Failed to fetch replies");
      }

      const data = await response.json();
      setReplies(data.replies);
    } catch (err) {
      console.error("Error fetching replies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [commentId]);

  const renderUser = (item: Reply | typeof initialComment) => {
    const isAgent = item.isAgentReply;
    const name = isAgent
      ? item.agent?.name || "AI"
      : item.user?.name || "Unknown";
    const username = isAgent
      ? item.agent?.username || ""
      : item.user?.username || "";
    const avatar = isAgent ? item.agent?.avatar : item.user?.image;

    return (
      <div className="flex gap-3 mb-4">
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
          ) : item.user?.image ? (
            <Image
              src={item.user.image}
              alt={item.user.name}
              width={32}
              height={32}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-500 text-xs font-bold">
                {item.user?.name?.charAt(0) || "?"}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{name}</span>
            <span className="text-gray-500 text-sm">
              {username ? `@${username}` : ""}
            </span>
            <span className="text-gray-400 text-sm">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>

          <p className="text-gray-800 mt-1">{item.content}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Conversation</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Original comment */}
          {renderUser(initialComment)}

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Replies */}
          {isLoading ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Loading replies...</p>
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500">No replies yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {replies.map((reply) => (
                <div key={reply.id}>{renderUser(reply)}</div>
              ))}
            </div>
          )}
        </div>

        {/* Reply form */}
        {isSignedIn && (
          <div className="mt-6">
            <CommentForm
              postId={postId}
              parentCommentId={commentId}
              onSuccess={fetchReplies}
            />
          </div>
        )}
      </div>
    </div>
  );
}
