import { Suspense } from 'react'
import ReadingPage from "@/components/reading-page";

export default function Reading(){
    return (
        <Suspense fallback={<div>Loading...</div>}>
          <ReadingPage />
        </Suspense>
      )
}