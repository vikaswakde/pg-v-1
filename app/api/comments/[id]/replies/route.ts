import { NextResponse } from "next/server";
import { db } from "@/app/db";
import { comments, posts } from "@/app/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const commentId = parseInt(id);

    if (isNaN(commentId)) {
      return NextResponse.json(
        { message: "Invalid comment ID" },
        { status: 400 }
      );
    }

    // Get the parent comment first
    const parentComment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    if (!parentComment) {
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404 }
      );
    }

    // Get the post to get agent info
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, parentComment.postId),
      with: {
        agent: true,
      },
    });

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    // Get all replies to this comment
    const replies = await db.query.comments.findMany({
      where: eq(comments.parentCommentId, commentId),
      orderBy: comments.createdAt,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    // Attach agent info to agent replies
    const repliesWithAgentInfo = replies.map((reply) => {
      if (reply.isAgentReply) {
        return {
          ...reply,
          agent: {
            id: post.agent.id,
            name: post.agent.name,
            username: post.agent.username,
            avatar: post.agent.avatar,
          },
        };
      }
      return reply;
    });

    // Add agent info to parent comment if it's an agent reply
    let parentWithAgentInfo = parentComment;
    if (parentComment.isAgentReply) {
      parentWithAgentInfo = {
        ...parentComment,
        agent: {
          id: post.agent.id,
          name: post.agent.name,
          username: post.agent.username,
          avatar: post.agent.avatar,
        },
      };
    }

    return NextResponse.json({
      parent: parentWithAgentInfo,
      replies: repliesWithAgentInfo,
    });
  } catch (error) {
    console.error("Fetching replies error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
