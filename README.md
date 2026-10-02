# WEB-SITE-SKRIPNIK — сайт для писателя

Сайт-портфолио автора рассказов: витрина текстов, регистрация читателей, комментарии, гостевая книга.
Реализация по ТЗ **`ТЗ — сайт для писателя.md`**. Стек: **React + Vite + TypeScript + Tailwind CSS**, бэкенд — **Supabase**.

## Быстрый старт на новом компьютере

```bash
git clone https://github.com/Yuri-Sverdlov/WEB-SITE-SKRIPNIK.git
cd WEB-SITE-SKRIPNIK
npm install
cp .env.example .env.local    # .env.local НЕ хранится в git — создать обязательно
npm run dev                   # http://localhost:5173
```

Проверки: `npm run build`, `npm run lint`.

> ⚠️ **`.env.local`** (переменные `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) в репозиторий не попадает — он в `.gitignore`.
> Шаблон лежит рядом: **`.env.example`**. Без `.env.local` сайт не подключится к Supabase.

## Документы проекта (кто что читает)

| Файл | Назначение |
|---|---|
| **`AGENTS.md`** | устав кодера — читать **первым** при старте сессии |
| **`CONTEXT.md`** | память проекта: стек, текущий этап, фокус |
| **`tasks/TASK.md`** | одно активное задание |
| **`tasks/REPORT.md`** | текущий отчёт кодера |
| **`PROJECT_LOG.md`** | журнал сессий (append-only) |
| **`tasks/done/`** | архив принятых TASK + REPORT + ACCEPTED |
| `ТЗ — сайт для писателя.md` | техническое задание |

Процесс: консультант задаёт этап → пользователь утверждает → архитектор пишет TASK → кодер реализует и отчитывается в REPORT .

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
