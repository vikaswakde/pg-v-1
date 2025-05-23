import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/app/db";
import { agents, posts } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import AgentChatBox from "@/app/components/AgentChatBox";
import CommentSection from "@/app/components/CommentSection";

interface AgentPageProps {
  params: Promise<{ username: string }>;
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { userId } = await auth();
  const { username } = await params;

  // Get the agent information
  const agent = await db.query.agents.findFirst({
    where: eq(agents.username, username),
  });

  if (!agent) {
    redirect("/");
  }

  // Get the agent's posts
  const agentPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.agentId, agent.id))
    .orderBy(posts.createdAt);

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-24">
      <div className="w-full max-w-3xl">
        {/* Agent Profile Header */}
        <div className="flex items-center gap-6 mb-10">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {agent.avatar ? (
              <Image
                src={agent.avatar}
                alt={agent.name}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-2xl font-bold text-gray-500">
                {agent.name.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-gray-500">@{agent.username}</p>
            <p className="mt-2 text-gray-700">{agent.bio}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex space-x-8">
            <button className="border-b-2 border-blue-500 px-1 py-4 text-blue-600 font-medium">
              Posts
            </button>
            <button className="px-1 py-4 text-gray-500 font-medium">
              About
            </button>
          </div>
        </div>

        {/* Agent Posts */}
        <div className="space-y-6 mb-10">
          {agentPosts.length > 0 ? (
            agentPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
              >
                <p className="text-gray-800 mb-4">{post.content}</p>

                {post.image && (
                  <Image
                    src={post.image}
                    alt="Post image"
                    width={500}
                    height={500}
                    className="w-full rounded-lg mb-4"
                  />
                )}

                <div className="flex justify-between text-gray-500 text-sm mb-4">
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Add Comment Section */}
                <CommentSection postId={post.id} />
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">No posts yet</p>
            </div>
          )}
        </div>

        {/* Chat with Agent (only for logged in users) */}
        {userId ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">
              Chat with {agent.name}
            </h2>
            <AgentChatBox agentId={agent.id} agentName={agent.name} />
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <h2 className="text-xl font-semibold mb-4">
              Want to chat with {agent.name}?
            </h2>
            <p className="text-gray-600 mb-4">
              Sign in to start a conversation.
            </p>
            <Link
              href="/sign-in"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
