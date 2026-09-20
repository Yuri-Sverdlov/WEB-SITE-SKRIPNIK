import StoryListPage from '../components/StoryListPage'
import { fetchStoriesNew } from '../api/stories'

export default function StoriesNew() {
  return <StoryListPage fetchPage={fetchStoriesNew} />
}