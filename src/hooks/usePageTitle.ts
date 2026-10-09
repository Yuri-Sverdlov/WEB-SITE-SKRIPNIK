import { useEffect } from 'react'

export function usePageTitle(title: string | undefined | null) {
  useEffect(() => {
    if (title) document.title = title
  }, [title])
}