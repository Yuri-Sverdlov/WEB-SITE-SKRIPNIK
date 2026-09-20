import StoryListPage from '../components/StoryListPage'
import { fetchStoriesPopular } from '../api/stories'

export default function StoriesPopular() {
  return <StoryListPage fetchPage={fetchStoriesPopular} />
}