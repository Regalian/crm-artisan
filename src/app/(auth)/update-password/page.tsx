import type { Metadata } from 'next'
import UpdatePasswordForm from './UpdatePasswordForm'

export const metadata: Metadata = {
  title: 'Set New Password',
}

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">CRM Artisan</p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-white">Set a new password</h1>
        </div>

        <UpdatePasswordForm />
      </div>
    </div>
  )
}
