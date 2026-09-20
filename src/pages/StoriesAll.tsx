import StoryListPage from '../components/StoryListPage'
import { fetchStoriesAll } from '../api/stories'

export default function StoriesAll() {
  return <StoryListPage fetchPage={fetchStoriesAll} />
}