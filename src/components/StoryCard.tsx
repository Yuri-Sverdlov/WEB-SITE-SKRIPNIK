import { Link } from 'react-router-dom'
import type { StoryListItem } from '../api/stories'

function formatDate(d: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('ru-RU')
  } catch {
    return d
  }
}

export default function StoryCard({ story }: { story: StoryListItem }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <Link
        to={`/stories/${story.id}`}
        className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
      >
        {story.title}
      </Link>
      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
        <span>{formatDate(story.published_at)}</span>
        <span>{story.views_count ?? 0} просмотров</span>
        {story.tags && story.tags.length > 0 && (
          <span className="flex flex-wrap gap-1 ml-1">
            {story.tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-xs"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}