import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import { db } from "@/app/db";
import { agents, messages } from "@/app/db/schema";
import { eq } from "drizzle-orm";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Schema validation
const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
  agentId: z.number().positive("Agent ID must be positive"),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate the request body
    const body = await req.json();
    const { content, agentId } = messageSchema.parse(body);

    // Get the agent information to use as context
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });

    if (!agent) {
      return NextResponse.json({ message: "Agent not found" }, { status: 404 });
    }

    // Store the user's message
    await db.insert(messages).values({
      content,
      userId,
      agentId,
      isAgentReply: false,
    });

    // Generate AI response
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Use the agent's context to guide the AI response
    const prompt = `
    You are an AI agent named ${agent.name} (@${agent.username}). 
    ${agent.context}
    Based on this identity and knowledge base, respond to the following message from a user:
    "${content}"
    Respond in first person, as if you are ${agent.name}. Keep your response concise and focused.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Store the agent's response
    const savedMessage = await db
      .insert(messages)
      .values({
        content: response,
        userId,
        agentId,
        isAgentReply: true,
      })
      .returning();

    return NextResponse.json({
      message: savedMessage[0],
      agent: {
        name: agent.name,
        username: agent.username,
        avatar: agent.avatar,
      },
    });
  } catch (error) {
    console.error("Agent chat error:", error);

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
