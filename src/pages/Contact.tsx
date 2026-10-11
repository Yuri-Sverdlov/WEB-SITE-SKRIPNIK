import { CONTACT_EMAIL, CONTACT_INTRO } from '../config/site'

export default function Contact() {
  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl md:text-3xl font-ui text-ink font-semibold mb-6">Связь</h1>

      <p className="font-story text-ink text-lg leading-relaxed mb-4">{CONTACT_INTRO}</p>

      <p className="font-story text-lg">
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">{CONTACT_EMAIL}</a>
      </p>
    </div>
  )
}