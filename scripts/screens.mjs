#!/usr/bin/env node
/**
 * scripts/screens.mjs — скриншоты страниц для блока F
 *
 * Использование:
 *   STORY_ID=<uuid> npm run screens
 *   STORY_ID=<uuid> BASE_URL=http://localhost:5173 npm run screens
 *   STORY_ID=<uuid> SHOTS=story,home npm run screens
 *
 * Переменные:
 *   STORY_ID — обязателен для снимков /stories/:id (F1 + F3)
 *   SHOTS    — список через запятую: story, home (по умолчанию story)
 *   BASE_URL — адрес (по умолчанию http://localhost:5173)
 *
 * Перед запуском: npm run dev (или BASE_URL на Vercel)
 */

import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const STORY_ID = process.env.STORY_ID || '';
const SHOTS = (process.env.SHOTS || 'story').split(',').map(s => s.trim()).filter(Boolean);
const OUT = 'reference/screens';
const VIEWPORT = { width: 1280, height: 900 };

if (SHOTS.includes('story') && !STORY_ID) {
  console.error('❌ Для снимка страницы рассказа укажите STORY_ID=<uuid>');
  console.error('   Пример: STORY_ID=55c8e74c-822b-4c8d-9899-c1d8e001f3e4 npm run screens');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: VIEWPORT });

async function shot(url, file, label) {
  console.log(`📷 ${label}: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); // дать React/данным отрисоваться
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
  console.log(`✅ Сохранено: ${OUT}/${file}`);
}

if (SHOTS.includes('story')) {
  const url = `${BASE_URL}/stories/${STORY_ID}`;
  await shot(url, 'f1-story-detail.png', 'Рассказ (F1)');
  await shot(url, 'f3-story-detail.png', 'Рассказ (F3)');
}

if (SHOTS.includes('home')) {
  await shot(`${BASE_URL}/`, 'f2-home.png', 'Главная (F2)');
}

await browser.close();
console.log('Готово.');