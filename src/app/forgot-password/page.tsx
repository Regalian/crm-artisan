import Link from 'next/link'
import ForgotPasswordForm from './ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">CRM Artisan</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Reset your password</p>
        </div>

        <ForgotPasswordForm />

        {/* Back to login link */}
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Remember your password?{' '}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
