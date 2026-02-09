import { redirect } from "next/navigation";

const isMockMode = process.env.USE_MOCK_ENGINE === 'true';

export default function SignInPage() {
  // In mock mode, skip sign-in and go straight to dashboard
  if (isMockMode) {
    redirect("/dashboard");
  }

  // In real mode, use Clerk's SignIn component
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SignIn } = require("@clerk/nextjs");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
