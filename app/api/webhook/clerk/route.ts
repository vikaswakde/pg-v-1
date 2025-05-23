import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { db } from "@/app/db";
import { users } from "@/app/db/schema";
import { eq } from "drizzle-orm";

// Webhook handler for Clerk events
export async function POST(req: Request) {
  // Verify the webhook signature
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET!");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, return an error
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Invalid headers" }, { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Webhook instance with your webhook secret
  const webhook = new Webhook(WEBHOOK_SECRET);

  try {
    // Verify the webhook signature
    webhook.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = payload;

  // Handle user creation
  if (type === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = data;

    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (existingUser.length === 0) {
        // Create a new user in our database
        await db.insert(users).values({
          id,
          username: id,
          email: email_addresses[0]?.email_address,
          name: `${first_name || ""} ${last_name || ""}`.trim(),
          image: image_url,
          onboarded: false,
        });
      }

      return NextResponse.json({ message: "User created" }, { status: 201 });
    } catch (error) {
      console.error("Error creating user:", error);
      return NextResponse.json(
        { error: "Error creating user" },
        { status: 500 }
      );
    }
  }

  // Handle user deletion
  if (type === "user.deleted") {
    const { id } = data;

    try {
      // Delete the user from our database
      await db.delete(users).where(eq(users.id, id));

      return NextResponse.json({ message: "User deleted" }, { status: 200 });
    } catch (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "Error deleting user" },
        { status: 500 }
      );
    }
  }

  // Return a 200 for any other events
  return NextResponse.json({ message: "Webhook received" }, { status: 200 });
}
