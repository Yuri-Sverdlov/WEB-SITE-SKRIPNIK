#!/usr/bin/env node
/**
 * scripts/screens.mjs — скриншоты страниц для блока F
 *
 * Использование:
 *   STORY_ID=<uuid> SHOTS=story npm run screens
 *   SHOTS=all ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run screens
 *
 * Переменные:
 *   SHOTS      — список через запятую или 'all'
 *                story | story-reply | home | contact | stories-new | stories-popular
 *                | stories-all | guestbook | login | register | admin-stories | admin-comments
 *   STORY_ID   — uuid рассказа (для 'story', 'story-reply')
 *   ADMIN_EMAIL / ADMIN_PASSWORD — для 'admin-stories' / 'admin-comments' (вход автора)
 *   BASE_URL   — адрес (по умолчанию http://localhost:5173)
 *
 * Перед запуском: npm run dev (или BASE_URL на Vercel)
 */

import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const STORY_ID = process.env.STORY_ID || '';
const OUT = 'reference/screens';
const VIEWPORT = { width: 1280, height: 900 };

const ALL = ['story', 'story-reply', 'home', 'contact', 'stories-new', 'stories-popular',
             'stories-all', 'guestbook', 'login', 'register', 'admin-stories', 'admin-comments'];

const raw = (process.env.SHOTS || 'story').trim();
const SHOTS = raw === 'all' ? ALL : raw.split(',').map(s => s.trim()).filter(Boolean);

const need = k => SHOTS.includes(k);

if ((need('story') || need('story-reply')) && !STORY_ID) {
  console.error('❌ Для снимка страницы рассказа укажите STORY_ID=<uuid>');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: VIEWPORT });
const page = await ctx.newPage();

async function shot(path, file, label) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  console.log(`📷 ${label}: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
  console.log(`✅ ${OUT}/${file}`);
}

if (need('story')) {
  await shot(`/stories/${STORY_ID}`, 'f3-story-detail.png', 'Рассказ (F3)');
}
if (need('story-reply')) {
  await shot(`/stories/${STORY_ID}`, 'g0-story-author-reply.png', 'Рассказ с ответом автора (G0)');
}
if (need('home'))    await shot('/',             'f4-home.png',          'Об авторе (F4)');
if (need('contact')) await shot('/contact',      'f4-contact.png',       'Связь (F4)');

if (need('stories-new'))     await shot('/stories/new',     'f5-stories-new.png',     'Рассказы: Новые');
if (need('stories-popular')) await shot('/stories/popular', 'f5-stories-popular.png', 'Рассказы: Популярные');
if (need('stories-all'))     await shot('/stories/all',     'f5-stories-all.png',     'Рассказы: Все');
if (need('guestbook'))       await shot('/guestbook',       'f5-guestbook.png',       'Гостевая книга');
if (need('login'))           await shot('/login',           'f5-login.png',           'Вход');
if (need('register'))        await shot('/register',        'f5-register.png',        'Регистрация');

// --- Страницы кабинета: нужен вход автором (один раз) ---
const wantAdminStories = need('admin-stories');
const wantAdminComments = need('admin-comments');

if (wantAdminStories || wantAdminComments) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('⚠️  admin-*: пропущено — задайте ADMIN_EMAIL и ADMIN_PASSWORD');
  } else {
    console.log('📷 Вход автором…');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type=submit]');
    await page.waitForTimeout(2000);

    if (wantAdminStories) {
      await shot('/admin/stories', 'f5-admin-stories.png', 'Кабинет: Рассказы');
    }
    if (wantAdminComments) {
      await shot('/admin/comments', 'g0-admin-comments.png', 'Кабинет: Комментарии (G0)');
    }
  }
}

await browser.close();
console.log('Готово.');