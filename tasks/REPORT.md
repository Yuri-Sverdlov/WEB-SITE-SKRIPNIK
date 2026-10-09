# Отчёт (кодер → архитектор)

**Задание:** TASK-019 — F1: направление дизайна + превью StoryDetail  
**Дата:** 2026-10-09  
**Статус:** выполнено

---

## Что сделано

### Dembrandt
- **evgeny-yakubovich.art** — успешно (4 цвета, 14 стилей текста, скриншот)
- **akunin.ru** — успешно (3 цвета, Times New Roman, скриншот)
- Артефакты: `reference/yakubovich/` + `reference/akunin/` (DESIGN.md + screenshot.png)

### `reference/design-direction.md`
- Палитра: paper (#faf6ee), ink (#2c3e50), accent (#3b6fa8), muted (#8b9bb5), border (#e2dcc8)
- Шрифты: Georgia/Times New Roman (serif) для текста, system-ui для UI
- Размер текста: 18px, line-height 1.7, колонка ~672px

### `tailwind.config.js`
- Расширение `colors` и `fontFamily` по design-direction

### Новый компонент `src/components/SiteHeaderPreview.tsx`
- Минимальная шапка: название сайта из `SITE_TITLE` (`src/config/site.ts`)
- Показывается **на странице рассказа** (и только там)

### `src/pages/StoryDetail.tsx`
- Обёрнут в `bg-paper / text-ink / font-story`
- Метаданные (дата, просмотры) — `text-muted`
- Ссылки — `text-accent`
- Границы — `border-border-light`
- Комментарии слегка приведены к палитре (полная проработка — TASK-021)

### Playwright
- `npm install -D @playwright/test`
- `scripts/screens.mjs` — скриншот StoryDetail при `STORY_ID=<uuid>`
- `package.json` — скрипт `"screens": "node scripts/screens.mjs"`
- Снят: `reference/screens/f1-story-detail.png` (рассказ «Дорога домой»)

### `.gitignore`
- `reference/screens/` коммитится (артефакт F1)
- Тяжёлые файлы Dembrandt в `output/` не коммитятся

## Проверки

### `npm run build`
```
✓ built in 437ms
```
Exit code: **0**.

### `npm run lint**
```
Found 6 warnings and 0 errors.
```

### `npm run screens`
```
📷 Снимок: http://localhost:5174/stories/55c8e74c-822b-4c8d-9899-c1d8e001f3e4
✅ Сохранено: reference/screens/f1-story-detail.png
```
Exit code: **0**.

## Остановка
Скрин отправлен архитектору. **Дальше (F2) — только после «ок» пользователя** (по брифу).

## Git
- **Локальный commit:** будет ниже
- **Push — не делать** (по TASK)