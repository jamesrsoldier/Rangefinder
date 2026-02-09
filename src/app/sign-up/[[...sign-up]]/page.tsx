import { redirect } from "next/navigation";

const isMockMode = process.env.USE_MOCK_ENGINE === 'true';

export default function SignUpPage() {
  // In mock mode, skip sign-up and go straight to dashboard
  if (isMockMode) {
    redirect("/dashboard");
  }

  // In real mode, use Clerk's SignUp component
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SignUp } = require("@clerk/nextjs");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
