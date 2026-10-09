import { CONTACT_EMAIL } from '../config/site'

export default function Contact() {
  return (
    <div>
      <h1 className="text-2xl font-ui text-ink font-semibold mb-4">Связь</h1>
      <p className="text-muted text-sm mb-3">
        Если вы хотите связаться с автором, напишите на:
      </p>
      <p className="font-story text-ink text-lg">
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">{CONTACT_EMAIL}</a>
      </p>
    </div>
  )
}