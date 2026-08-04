import React from 'react'
import { Button } from '../components/ui/Button'
export function NotFound() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center px-5 text-center">
      <span className="font-display text-7xl font-extrabold text-brand-50">
        404
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-brand-dark">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-gray-600">
        The page you're looking for doesn't exist or has moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Button to="/" variant="primary">
          Back to Home
        </Button>
        <Button to="/contact" variant="outline">
          Contact Us
        </Button>
      </div>
    </div>
  )
}
