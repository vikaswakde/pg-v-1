import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import { db } from "@/app/db";
import { comments, posts } from "@/app/db/schema";
import { eq } from "drizzle-orm";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Schema validation
const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  postId: z.number().positive("Post ID must be positive"),
  parentCommentId: z.number().optional(),
});

// POST: Create a new comment
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate the request body
    const body = await req.json();
    const { content, postId, parentCommentId } = commentSchema.parse(body);

    // Get the post to check if it exists and to get the associated agent
    const postWithAgent = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        agent: true,
      },
    });

    if (!postWithAgent) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    // Store the user's comment
    const newComment = await db
      .insert(comments)
      .values({
        content,
        userId,
        postId,
        parentCommentId: parentCommentId || 0,
        isAgentReply: false,
      })
      .returning();

    // If we need to generate an AI response
    if (
      parentCommentId === undefined ||
      parentCommentId === 0 ||
      parentCommentId > 0
    ) {
      const agent = postWithAgent.agent;
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // Get conversation history if this is a reply to an existing comment
      let conversationHistory = "";
      if (parentCommentId && parentCommentId > 0) {
        // Get the parent comment and any previous replies in the thread
        const parentComment = await db.query.comments.findFirst({
          where: eq(comments.id, parentCommentId),
        });

        if (parentComment) {
          const commentThread = await db.query.comments.findMany({
            where: eq(comments.parentCommentId, parentCommentId),
            orderBy: comments.createdAt,
          });

          // Build the conversation history
          conversationHistory = `
          Previous comments in this thread: 
          ${commentThread
            .map((c) =>
              c.isAgentReply
                ? `${agent.name}: ${c.content}`
                : `User: ${c.content}`
            )
            .join("\n\n")}

            Current user comment: ${content}`;
        }
      }

      // Use the agent's context and post content to guide the AI response
      const prompt = `
      You are an AI agent named ${agent.name} (@${agent.username}).
      
      AGENT CONTEXT:
      ${agent.context}
      
      POST CONTENT:
      ${postWithAgent.content}
      
      ${
        conversationHistory
          ? `CONVERSATION HISTORY:\n${conversationHistory}\n\n`
          : `A user has commented on your post: "${content}"\n\n`
      }
      
      Based on your identity, knowledge base, and the post content, respond to this comment.
      Respond in first person, as if you are ${
        agent.name
      }. Keep your response concise, insightful, and focused.
      Remember that you are the author of the post content shown above.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Store the agent's response as a reply
      const targetParentId =
        parentCommentId && parentCommentId > 0
          ? parentCommentId
          : newComment[0].id;

      await db.insert(comments).values({
        content: response,
        userId: null, // Agent responses don't have a user ID
        postId,
        parentCommentId: targetParentId,
        isAgentReply: true,
      });
    }

    // Return the newly created comment
    return NextResponse.json({ comment: newComment[0] });
  } catch (error) {
    console.error("Comment creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid data", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Fetch comments for a post
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get("postId");

    if (!postId || isNaN(Number(postId))) {
      return NextResponse.json(
        { message: "Invalid or missing post ID" },
        { status: 400 }
      );
    }

    // Get the post to get the associated agent
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, Number(postId)),
      with: {
        agent: true,
      },
    });

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    // Get all comments for the post
    const postComments = await db.query.comments.findMany({
      where: eq(comments.postId, Number(postId)),
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
    const commentsWithAgentInfo = postComments.map((comment) => {
      if (comment.isAgentReply) {
        return {
          ...comment,
          agent: {
            id: post.agent.id,
            name: post.agent.name,
            username: post.agent.username,
            avatar: post.agent.avatar,
          },
        };
      }
      return comment;
    });

    return NextResponse.json({ comments: commentsWithAgentInfo });
  } catch (error) {
    console.error("Fetching comments error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
