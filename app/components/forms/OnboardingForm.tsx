"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  bio: z.string().max(250, "Bio should not exceed 250 characters"),
});

type FormData = z.infer<typeof formSchema>;

interface OnboardingFormProps {
  userData: {
    id: string;
    username: string;
    name: string;
    email: string;
    image: string;
    bio: string;
    onboarded: boolean;
  };
}

export default function OnboardingForm({ userData }: OnboardingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: userData.name,
      username: userData.username || "",
      bio: userData.bio || "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userData.id,
          name: data.name,
          username: data.username,
          bio: data.bio,
          image: userData.image,
          email: userData.email,
        }),
      });

      if (response.ok) {
        router.push("/");
      } else {
        const error = await response.json();
        throw new Error(error.message || "Something went wrong");
      }
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex justify-center">
        {userData.image && (
          <div className="relative h-20 w-20 overflow-hidden rounded-full">
            <Image
              src={userData.image}
              alt={userData.name || "Profile picture"}
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name
          </label>
          <input
            id="name"
            {...register("name")}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username
          </label>
          <input
            id="username"
            {...register("username")}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-500">
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            {...register("bio")}
            rows={4}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.bio && (
            <p className="mt-1 text-sm text-red-500">{errors.bio.message}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
