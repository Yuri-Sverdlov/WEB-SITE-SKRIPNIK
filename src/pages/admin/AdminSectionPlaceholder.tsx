type Props = {
  title: string
  taskLabel: string
}

export default function AdminSectionPlaceholder({ title, taskLabel }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-gray-600 text-sm">Раздел в разработке ({taskLabel}).</p>
    </div>
  )
}
