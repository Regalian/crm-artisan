'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { resetPassword } from '@/app/actions/auth'
import { AlertCircle, Mail, CheckCircle } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Sending...' : 'Send Reset Link'}
    </button>
  )
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState(resetPassword, null)

  if (state?.success) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-8 text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <Mail className="text-green-600 dark:text-green-400" size={24} />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Check your email</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          We&apos;ve sent you a password reset link. Click the link in the email to set a new password.
        </p>
        <a
          href="/login"
          className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
        >
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <form action={formAction} className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-8 space-y-5">
      {/* Error display */}
      {state?.error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label htmlFor="reset-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Email
        </label>
        <input
          id="reset-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <SubmitButton />
    </form>
  )
}
