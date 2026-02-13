import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedPage = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
]);

const isProtectedApi = createRouteMatcher([
  "/api/projects(.*)",
  "/api/admin(.*)",
  "/api/billing(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip auth enforcement in mock mode (local dev only, blocked in production)
  if (process.env.USE_MOCK_ENGINE === "true" && process.env.NODE_ENV !== "production") {
    return;
  }

  if (isProtectedPage(req)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
    });
  }

  if (isProtectedApi(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
