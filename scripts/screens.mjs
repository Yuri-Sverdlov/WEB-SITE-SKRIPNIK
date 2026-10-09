#!/usr/bin/env node
/**
 * scripts/screens.mjs — скриншоты страниц для этапа F
 * Использование:
 *   STORY_ID=<uuid> npm run screens
 *   STORY_ID=<uuid> BASE_URL=http://localhost:5173 npm run screens
 *
 * Перед запуском: npm run dev (или BASE_URL на Vercel)
 */

import { chromium } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const STORY_ID = process.env.STORY_ID || '';
const OUT = 'reference/screens';

if (!STORY_ID) {
  console.error('❌ Укажите STORY_ID=<uuid>');
  console.error('   Пример: STORY_ID=55c8e74c-822b-4c8d-9899-c1d8e001f3e4 npm run screens');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// --- F1: StoryDetail ---
const storyUrl = `${BASE_URL}/stories/${STORY_ID}`;
console.log(`📷 Снимок: ${storyUrl}`);
await page.goto(storyUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000); // DOM JS завершился

import fs from 'fs';
fs.mkdirSync(OUT, { recursive: true });
await page.screenshot({ path: `${OUT}/f1-story-detail.png`, fullPage: true });
console.log(`✅ Сохранено: ${OUT}/f1-story-detail.png`);

await browser.close();