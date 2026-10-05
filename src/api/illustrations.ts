import { supabase } from './supabaseClient'

function mapStorageError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('row-level security') || m.includes('violates rls') || m.includes('policy')) {
    return 'Недостаточно прав для загрузки изображений.'
  }
  if (m.includes('row count') || m.includes('multiple rows')) {
    return 'Такой файл уже существует.'
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Ошибка сети. Проверьте подключение.'
  }
  if (m.includes('timeout')) {
    return 'Сервер не отвечает. Попробуйте позже.'
  }
  if (m.includes('not found')) {
    return 'Файл не найден в хранилище.'
  }
  return `Ошибка: ${message}`
}

/** Сгенерировать путь для файла в Storage */
function makeFilePath(storyId: string, fileName: string): string {
  const ext = (fileName.split('.').pop() || 'jpg').toLowerCase()
  const uuid = crypto.randomUUID()
  return `stories/${storyId}/${uuid}.${ext}`
}

/** Валидация файла перед загрузкой */
export function validateImage(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Можно загружать только изображения.'
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Файл слишком большой. Максимум 5 МБ.'
  }
  return null
}

/** Загрузить одну иллюстрацию и вернуть её публичный URL */
export async function uploadStoryIllustration(
  storyId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const err = validateImage(file)
  if (err) return { url: null, error: err }

  const filePath = makeFilePath(storyId, file.name)

  const { error: uploadErr } = await supabase.storage
    .from('illustrations')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadErr) return { url: null, error: mapStorageError(uploadErr.message) }

  const { data: { publicUrl } } = supabase.storage
    .from('illustrations')
    .getPublicUrl(filePath)

  return { url: publicUrl, error: null }
}

/** Удалить одну иллюстрацию из Storage и убрать URL из массива БД */
export async function removeStoryIllustration(
  storyId: string,
  publicUrl: string,
): Promise<{ error: string | null }> {
  // Извлекаем путь из публичного URL
  const prefix = `/storage/v1/object/public/illustrations/`
  const idx = publicUrl.indexOf(prefix)
  if (idx === -1) {
    return { error: 'Некорректный URL иллюстрации.' }
  }
  const filePath = publicUrl.substring(idx + prefix.length)

  const { error: removeErr } = await supabase.storage
    .from('illustrations')
    .remove([filePath])

  if (removeErr) {
    // Если файла уже нет — не фатально, убираем URL из БД
    console.warn('removeStoryIllustration: remove error', removeErr)
  }

  // Убираем URL из массива в БД
  const { data: story } = await supabase
    .from('stories')
    .select('illustrations')
    .eq('id', storyId)
    .single()

  if (story) {
    const current: string[] = (story as { illustrations: string[] }).illustrations ?? []
    const updated = current.filter((u) => u !== publicUrl)
    const { error: updateErr } = await supabase
      .from('stories')
      .update({ illustrations: updated })
      .eq('id', storyId)
    if (updateErr) return { error: mapStorageError(updateErr.message) }
  }

  return { error: null }
}

/** Удалить все иллюстрации рассказа при удалении самого рассказа */
export async function deleteAllStoryIllustrations(
  storyId: string,
  existingUrls?: string[],
): Promise<{ error: string | null }> {
  // 1. Пробуем удалить по массиву URL из БД (если передан)
  if (existingUrls && existingUrls.length > 0) {
    const prefix = `/storage/v1/object/public/illustrations/`
    const paths: string[] = []
    for (const url of existingUrls) {
      const idx = url.indexOf(prefix)
      if (idx !== -1) {
        paths.push(url.substring(idx + prefix.length))
      }
    }
    if (paths.length > 0) {
      const { error: rmErr } = await supabase.storage
        .from('illustrations')
        .remove(paths)
      if (rmErr) {
        console.warn('deleteAllStoryIllustrations: remove error', rmErr)
      }
    }
    return { error: null }
  }

  // 2. Если URL не переданы — листинг по префиксу
  const { data: files, error: listErr } = await supabase.storage
    .from('illustrations')
    .list(`stories/${storyId}`)

  if (listErr) {
    // Если папки нет в Storage — не ошибка (рассказ без иллюстраций)
    return { error: null }
  }

  if (files && files.length > 0) {
    const paths = files.map((f) => `stories/${storyId}/${f.name}`)
    const { error: rmErr } = await supabase.storage
      .from('illustrations')
      .remove(paths)
    if (rmErr) {
      console.warn('deleteAllStoryIllustrations (list path): remove error', rmErr)
    }
  }

  return { error: null }
}