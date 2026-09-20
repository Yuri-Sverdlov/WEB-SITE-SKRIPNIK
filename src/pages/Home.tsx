import { useEffect } from 'react'
import { supabase } from '../api/supabaseClient'

export default function Home() {
  useEffect(() => {
    supabase.from('stories').select('*').then(console.log)
  }, [])

  return <h1>Home</h1>
}
