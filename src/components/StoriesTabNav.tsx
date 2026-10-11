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
      <h1 className="text-2xl md:text-3xl font-ui text-ink font-semibold mb-3">
        {q ? 'Результаты поиска' : 'Рассказы'}
      </h1>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1 border-b border-border-light flex-1 min-w-0">
          {tabs.map((tab) => {
            const active = location.pathname === tab.to
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                  active
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-muted hover:text-ink hover:bg-white/60'
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
          className="border border-border-light rounded px-3 py-1.5 text-sm w-64 font-ui focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
      </div>
    </div>
  )
}