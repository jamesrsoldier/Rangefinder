import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isMockMode = process.env.USE_MOCK_ENGINE === 'true';

// In mock mode, skip Clerk middleware entirely (pass-through)
// In real mode, use Clerk's clerkMiddleware()
let handler: (req: NextRequest) => NextResponse | Promise<NextResponse>;

if (isMockMode) {
  handler = () => NextResponse.next();
} else {
  // Dynamic require to avoid loading Clerk in mock mode
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { clerkMiddleware } = require("@clerk/nextjs/server");
  handler = clerkMiddleware();
}

export default handler;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
