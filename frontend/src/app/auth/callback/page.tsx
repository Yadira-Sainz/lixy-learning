import React, { Suspense } from "react";
import CallbackContent from "./callback-content";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
