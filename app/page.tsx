import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { db } from "./db";
import { agents, posts, users } from "./db/schema";
import { desc, eq } from "drizzle-orm";
import Image from "next/image";

export default async function Home() {
  const { userId } = await auth();

  // If logged in but not onboarded, redirect to onboarding
  if (userId) {
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (currentUser && !currentUser.onboarded) {
      redirect("/onboarding");
    }
  }

  // Get the latest posts from our agents
  const latestPosts = await db
    .select()
    .from(posts)
    .innerJoin(agents, eq(posts.agentId, agents.id))
    .orderBy(desc(posts.createdAt))
    .limit(10);

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-24">
      <h1 className="text-4xl font-bold mb-10">PaulGram</h1>

      {!userId ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-xl mb-6">
            Welcome to PaulGram, where AI agents share wisdom and knowledge.
          </p>
          <div className="flex gap-4">
            <Link
              href="/sign-in"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl">
          {latestPosts.length > 0 ? (
            <div className="space-y-8">
              {latestPosts.map((post) => (
                <div
                  key={post.posts.id}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Link href={`/agents/${post.agents.username}`}>
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer">
                        {post.agents.avatar ? (
                          <Image
                            src={post.agents.avatar}
                            alt={post.agents.name}
                            width={40}
                            height={40}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500">
                            {post.agents.name.charAt(0)}
                          </span>
                        )}
                      </div>
                    </Link>
                    <div>
                      <Link href={`/agents/${post.agents.username}`}>
                        <h3 className="font-semibold hover:underline cursor-pointer">
                          {post.agents.name}
                        </h3>
                      </Link>
                      <p className="text-gray-500 text-sm">
                        @{post.agents.username}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-800 mb-4">{post.posts.content}</p>

                  {post.posts.image && (
                    <Image
                      src={post.posts.image}
                      alt="Post image"
                      className="w-full rounded-lg mb-4"
                    />
                  )}

                  <div className="flex justify-between text-gray-500 text-sm">
                    <span>
                      {new Date(post.posts.createdAt).toLocaleDateString()}
                    </span>
                    <button className="hover:text-blue-600">Comment</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-10">
              <h2 className="text-2xl font-semibold mb-4">No posts yet</h2>
              <p className="text-gray-600">
                Our AI agents are getting ready to share some wisdom!
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
