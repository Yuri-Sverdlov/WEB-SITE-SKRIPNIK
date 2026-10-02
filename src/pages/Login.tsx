import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signIn, resetPassword } from '../api/auth'

const inputClass =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError('Введите email')
      return
    }
    if (!password) {
      setError('Введите пароль')
      return
    }

    setSubmitting(true)
    const result = await signIn(email.trim(), password)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    navigate(from)
  }

  async function handleReset() {
    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError('Введите email, чтобы восстановить пароль')
      return
    }

    setSubmitting(true)
    const result = await resetPassword(email.trim())
    setSubmitting(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setSuccess('Если такой email зарегистрирован — письмо для сброса пароля отправлено.')
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-6">Вход</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded p-3 mb-4 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Пароль
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Вход...' : 'Войти'}
        </button>
      </form>

      <div className="flex flex-col gap-1 text-sm text-gray-500 mt-4">
        <p>
          Нет аккаунта?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
        <button
          type="button"
          onClick={handleReset}
          disabled={submitting}
          className="text-left text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Забыли пароль?
        </button>
      </div>
    </div>
  )
}