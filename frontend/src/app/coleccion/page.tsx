import { Suspense } from 'react'
import OneReadingCollection from "@/components/one-reading-collection"

export default function Collection() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OneReadingCollection />
    </Suspense>
  )
}