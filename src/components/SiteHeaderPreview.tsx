import { SITE_TITLE } from '../config/site'

/**
 * Минимальная шапка для превью F1.
 * Полное меню F2 — TASK-020.
 */
export default function SiteHeaderPreview() {
  return (
    <header className="border-b border-border-light bg-paper">
      <div className="max-w-4xl mx-auto px-8 md:px-12 py-5">
        <h1 className="text-2xl font-ui text-ink font-bold tracking-tight leading-tight">
          {SITE_TITLE}
        </h1>
      </div>
    </header>
  )
}