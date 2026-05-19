import Link from 'next/link'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; passwordUpdated?: string }>
}) {
  const resolved = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">CRM Artisan</p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-white">Sign in to your account</h1>
        </div>

        {/* Password update success message */}
        {resolved.passwordUpdated && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              Password updated! Please sign in with your new password.
            </p>
          </div>
        )}

        {/* Registration success message */}
        {resolved.registered && !resolved.passwordUpdated && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              Account created! Please sign in below.
            </p>
          </div>
        )}

        <LoginForm />

        {/* Signup link */}
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
