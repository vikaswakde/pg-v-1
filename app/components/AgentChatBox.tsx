"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface AgentChatBoxProps {
  agentId: number;
  agentName: string;
}

interface Message {
  id?: number;
  content: string;
  isAgentReply: boolean;
  createdAt?: Date;
}

export default function AgentChatBox({
  agentId,
  agentName,
}: AgentChatBoxProps) {
  // We're keeping the useUser hook for authentication context even if we don't use it directly
  useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom of the chat when messages are updated
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || isLoading) return;

    // Add the user's message to the chat
    setMessages((prev) => [
      ...prev,
      { content: newMessage, isAgentReply: false },
    ]);

    // Clear the input
    setNewMessage("");

    try {
      setIsLoading(true);

      // Send the message to the agent
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newMessage,
          agentId,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Add the agent's response to the chat
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id,
            content: data.message.content,
            isAgentReply: true,
            createdAt: new Date(data.message.createdAt),
          },
        ]);
      } else {
        // Handle errors
        const error = await response.json();
        console.error("Error sending message:", error);

        // Add an error message
        setMessages((prev) => [
          ...prev,
          {
            content:
              "Sorry, I couldn't process your message. Please try again.",
            isAgentReply: true,
          },
        ]);
      }
    } catch (error) {
      console.error("Error in chat:", error);

      // Add an error message
      setMessages((prev) => [
        ...prev,
        {
          content: "An error occurred. Please try again later.",
          isAgentReply: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            <p>Start a conversation with {agentName}</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.isAgentReply ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isAgentReply
                    ? "bg-gray-100 text-gray-800"
                    : "bg-blue-600 text-white"
                }`}
              >
                <p>{message.content}</p>
                {message.createdAt && (
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4 flex items-center">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message ${agentName}...`}
          className="flex-1 py-2 px-4 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-6 rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isLoading || !newMessage.trim()}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
