import { Link, useLocation, useSearchParams } from 'react-router-dom'

const tabs = [
  { label: 'Новые', to: '/stories/new' },
  { label: 'Популярные', to: '/stories/popular' },
  { label: 'Все', to: '/stories/all' },
]

export default function StoriesTabNav() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''

  function handleSearchChange(value: string) {
    if (value) {
      setSearchParams({ q: value })
    } else {
      setSearchParams({})
    }
  }

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold mb-3">
        {q ? 'Результаты поиска' : 'Рассказы'}
      </h1>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1 border-b border-gray-200 flex-1 min-w-0">
          {tabs.map((tab) => {
            const active = location.pathname === tab.to
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                  active
                    ? 'text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        <input
          type="text"
          value={q}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Поиск рассказов..."
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
        />
      </div>
    </div>
  )
}