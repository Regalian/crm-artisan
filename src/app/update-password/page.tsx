import UpdatePasswordForm from './UpdatePasswordForm'

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">CRM Artisan</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">Set a new password</p>
        </div>

        <UpdatePasswordForm />
      </div>
    </div>
  )
}
