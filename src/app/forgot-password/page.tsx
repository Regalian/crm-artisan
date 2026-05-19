import Link from 'next/link'
import ForgotPasswordForm from './ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">CRM Artisan</p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-white">Reset your password</h1>
        </div>

        <ForgotPasswordForm />

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
