import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/app/db";
import { users } from "@/app/db/schema";
import { eq } from "drizzle-orm";

// Validate the request data
const userSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  username: z
    .string()
    .min(3)
    .regex(/^[a-zA-Z0-9_]+$/),
  bio: z.string().max(250).optional(),
  image: z.string().url().optional(),
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate the request body
    const body = await req.json();
    const validatedData = userSchema.parse(body);

    // Check if the user ID from Clerk matches the user ID in the request
    if (userId !== validatedData.id) {
      return NextResponse.json(
        { message: "Unauthorized: User ID mismatch" },
        { status: 401 }
      );
    }

    // Check if username is already taken
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1);

    if (existingUser.length > 0 && existingUser[0].id !== userId) {
      return NextResponse.json(
        { message: "Username already taken" },
        { status: 409 }
      );
    }

    // Update or create the user in the database
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (userRecord.length > 0) {
      await db
        .update(users)
        .set({
          name: validatedData.name,
          username: validatedData.username,
          bio: validatedData.bio || null,
          image: validatedData.image || null,
          onboarded: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      await db.insert(users).values({
        id: userId,
        name: validatedData.name,
        username: validatedData.username,
        email: validatedData.email,
        bio: validatedData.bio || null,
        image: validatedData.image || null,
        onboarded: true,
      });
    }

    return NextResponse.json(
      { message: "User onboarded successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Onboarding Error:", error);

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
