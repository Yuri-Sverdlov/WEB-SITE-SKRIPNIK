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
    <div className="border border-border-light rounded-lg p-4 hover:shadow-sm transition-shadow">
      <Link
        to={`/stories/${story.id}`}
        className="font-story text-lg text-accent hover:text-accent hover:underline"
      >
        {story.title}
      </Link>
      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted">
        <span>{formatDate(story.published_at)}</span>
        <span>{story.views_count ?? 0} просмотров</span>
        {story.tags && story.tags.length > 0 && (
          <span className="flex flex-wrap gap-1 ml-1">
            {story.tags.map((tag) => (
              <span
                key={tag}
                className="bg-border-light/60 text-muted rounded-full px-2.5 py-0.5 text-xs"
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