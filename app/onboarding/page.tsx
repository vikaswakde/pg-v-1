import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import OnboardingForm from "../components/forms/OnboardingForm";

async function Onboarding() {
  const user = await currentUser();

  if (!user) return redirect("/sign-in");

  const userData = {
    id: user.id,
    username: user.username || "",
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    email: user.emailAddresses[0]?.emailAddress || "",
    image: user.imageUrl,
    bio: "",
    onboarded: false,
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen py-10 px-6 md:px-0">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Complete Your Profile
        </h1>
        <p className="text-sm text-gray-600 mb-8 text-center">
          Tell us more about yourself to get started with PaulGram
        </p>
        <OnboardingForm userData={userData} />
      </div>
    </main>
  );
}

export default Onboarding;
