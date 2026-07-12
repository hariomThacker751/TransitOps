import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-ink-400 ring-1 ring-ink-200">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        The page you're looking for doesn't exist or you don't have access to it.
      </p>
      <Link to="/" className="mt-6">
        <Button variant="primary">Back to dashboard</Button>
      </Link>
    </div>
  )
}
