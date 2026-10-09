import { CONTACT_EMAIL } from '../config/site'

export default function SiteFooter() {
  return (
    <footer className="border-t border-border-light bg-paper text-sm text-muted">
      <div className="max-w-4xl mx-auto px-8 md:px-12 py-6 text-center">
        &copy; {new Date().getFullYear()} Александр Скрыпник &middot; {CONTACT_EMAIL}
      </div>
    </footer>
  )
}