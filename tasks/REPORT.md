# Отчёт (кодер → архитектор)

**Задание:** TASK-022 — F4: «Об авторе» (главная) и «Связь»  
**Дата:** 2026-10-11  
**Статус:** выполнено

---

## Что сделано

### 1. `src/config/site.ts` — новые константы
- `CONTACT_INTRO` — вступительная фраза «Связи»
- `AUTHOR_PHOTO_ALT`, `AUTHOR_PHOTO_CAPTION` («Фото будет добавлено») — заглушка фото
- `ABOUT_TITLE` («Об авторе») — заголовок главной

### 2. `src/pages/Home.tsx` — «Об авторе»
- H1 `ABOUT_TITLE`, палитра/шрифты F1–F3.
- **Заглушка фото 1:1:** `aspect-square`, `border-light`, фон `white`, подпись `AUTHOR_PHOTO_CAPTION`; блок помечен комментарием для замены на реальное фото.
- Имя автора (`AUTHOR_NAME`) + `BIOGRAPHY` через `prose font-story` (18px, serif).
- **«Последние рассказы»:** `fetchLatestStories(5)` — `published_at DESC`; ссылка на `/stories/:id`, заголовок + дата (ru-RU).
- Пустой список → «Пока нет опубликованных рассказов.»
- Ссылка **«Все рассказы →»** → `/stories/all`.
- Контейнер `max-w-2xl mx-auto` — колонка как на странице рассказа.

### 3. `src/api/stories.ts`
- Добавлена **`fetchLatestStories(limit = 5)`** — `published_at DESC`, `range(0, limit-1)`.

### 4. `src/pages/Contact.tsx`
- `CONTACT_INTRO` (текст из `site.ts`) + `mailto:` на `CONTACT_EMAIL`. Дублей строк в JSX нет.

### 5. `scripts/screens.mjs`
- `SHOTS=home,contact` → `f4-home.png`, `f4-contact.png` (1280, fullPage).
- (ключ `home` раньше писал `f2-home.png`; старый файл F2 оставлен как история).

## Скриншоты
- `reference/screens/f4-home.png` — Об авторе: заголовок, заглушка фото 1:1, биография, 5 последних рассказов с датами, «Все рассказы →», подвал.
- `reference/screens/f4-contact.png` — Связь: заголовок, фраза, email-ссылка, подвал.

Данные в списке — текущие тестовые рассказы БД (7 шт.), сортировка DESC проверена визуально (22.10 → 18.09 → 17.09 → 15.09).

## Проверки

### `npm run build`
```
✓ built in 501ms
```
Exit code: **0**.

### `npm run lint`
```
Found 6 warnings and 0 errors.
```

### `npm run screens`
```
✅ reference/screens/f4-home.png
✅ reference/screens/f4-contact.png
```
Exit code: **0**.

## Попутно
Найден и остановлен «зависший» dev-сервер (node, порт 5173) от прошлой сессии — чтобы скриншоты не снимались со старого кода.

## Git
- **Локальный commit** (ниже)
- **Push — не делать** (по TASK)