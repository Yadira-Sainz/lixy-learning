// src/app/auth/page.tsx
import React, { Suspense } from 'react';
import AuthPageComponent from "@/components/auth-page"

const AuthPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPageComponent />
    </Suspense>
  );
};

export default AuthPage;
