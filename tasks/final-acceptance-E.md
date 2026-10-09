# Финальная приёмка блока E — чек-лист пользователя

**Где:** живой сайт (или `localhost:5173` — база та же). **Окно инкогнито.**
**Время:** ~20 минут. Результаты — архитектору, он впишет их в `consultant-block-E-report.md`.

---

## Часть 1. Проверка защиты от лица читателя (одним скриптом)

Заменяет ручные проверки a, b, c, d, h, m на **живой** базе (в отчёте они проверены только на локальной копии PostgreSQL).

1. Войдите **тестовым читателем** (`test.hermes.skripnik@gmail.com`). У него уже есть никнейм (с проверок E6).
2. Нажмите **F12** → вкладка **Console** (Консоль).
3. Если браузер просит разрешить вставку — наберите `allow pasting` и Enter.
4. Вставьте скрипт целиком и нажмите Enter.

```js
(async () => {
  const ref = 'gwsapscczrscskpaayfy', base = `https://${ref}.supabase.co`;
  const key = 'sb_publishable_N_vSmhLgKWEMNFnrF8FeMA_zMa4GkUF';
  const sess = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`) || 'null');
  if (!sess) { console.log('Сначала войдите читателем'); return; }
  const me = sess.user.id;
  const H = { apikey: key, Authorization: 'Bearer ' + sess.access_token,
              'Content-Type': 'application/json', Prefer: 'return=representation' };
  const call = async (m, p, b, h = H) => {
    const x = await fetch(base + p, { method: m, headers: h, body: b });
    return { s: x.status, t: await x.text() };
  };
  const get = async p => (await fetch(base + p, { headers: H })).json();
  const story = (await get('/rest/v1/stories?select=id,title&limit=1'))[0];
  const other = (await get(`/rest/v1/comments?select=id,user_id&user_id=neq.${me}&limit=1`))[0];
  const res = [];
  const chk = (id, what, r, ok) => res.push({ id, what, status: r.s, OK: ok ? 'ДА' : '!!! НЕТ', ответ: r.t.slice(0, 120) });
  const denied = r => r.s >= 400 || r.t === '[]';

  let r = await call('POST', '/rest/v1/stories', JSON.stringify({ title: 'hack', content: 'hack' }));
  chk('a1', 'создать рассказ', r, denied(r));
  r = await call('PATCH', `/rest/v1/stories?id=eq.${story.id}`, JSON.stringify({ title: 'HACK' }));
  chk('a2', 'изменить рассказ', r, denied(r));
  r = await call('DELETE', `/rest/v1/stories?id=eq.${story.id}`);
  chk('a3', 'удалить рассказ', r, denied(r));
  if (other) {
    r = await call('DELETE', `/rest/v1/comments?id=eq.${other.id}`);
    chk('b', 'удалить чужой комментарий', r, denied(r));
  }
  r = await call('POST', '/storage/v1/object/illustrations/hack.txt', 'hack',
                 { apikey: key, Authorization: H.Authorization, 'Content-Type': 'text/plain' });
  chk('c', 'загрузить файл в illustrations', r, r.s >= 400);
  r = await call('POST', '/rest/v1/comments', JSON.stringify({
    story_id: story.id, user_id: me, author_name: 'Скрипник', body: 'проверка d (удалить)',
    is_author_reply: true, parent_id: other ? other.id : null }));
  let d = null; try { d = JSON.parse(r.t); } catch {}
  const row = Array.isArray(d) ? d[0] : null;
  chk('d', 'подделать «ответ автора» и имя', r,
      r.s >= 400 || (row && row.is_author_reply === false && row.parent_id === null && row.author_name !== 'Скрипник'));
  r = await call('POST', '/rest/v1/banned_users', JSON.stringify({ user_id: me }));
  chk('h1', 'заблокировать себя/других', r, denied(r));
  r = await call('POST', '/rest/v1/rpc/admin_delete_user_messages', JSON.stringify({ target_user_id: me }));
  chk('h2', 'вызвать «удалить все сообщения»', r, r.s >= 400);
  const profs = await get('/rest/v1/reader_profiles?select=user_id');
  r = { s: 200, t: `видно профилей: ${profs.length}` };
  chk('m', 'прочитать чужие профили', r, profs.every(p => p.user_id === me));
  console.table(res);
  console.log(res.every(x => x.OK === 'ДА') ? '✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : '❌ ЕСТЬ ПРОВАЛ — пришлите таблицу консультанту');
})();
```

**Ожидается:** в колонке `OK` везде **ДА** и строка **«✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ»**. Сделайте снимок экрана таблицы.
Проверка **d** создаёт один комментарий «проверка d (удалить)» — он уйдёт при уборке в части 2.

---

## Часть 2. Автором, вживую (модерация + уборка)

Это и есть приёмочный тест модерации, который в отчёте помечен как «не полный». Войдите автором (`sverdlov.y@yandex.ru`).

| # | Действие | Ожидание | ✓ |
|---|---|---|---|
| 1 | Кабинет → Комментарии: у одного тестового комментария **Удалить** → ОК | исчез из списка и со страницы рассказа | |
| 2 | У комментария тестового читателя **Заблокировать** (причина «тест») | появился в «Заблокированные» с email | |
| 3 | Войти читателем в другом окне инкогнито → попробовать написать | отказ «Вы не можете оставлять сообщения…» | |
| 4 | Автором: «Заблокированные» → **Разблокировать** | читатель снова может писать | |
| 5 | **Удалить все** у тестового читателя | окно с числами; после ОК — все его сообщения исчезли | |
| 6 | Повторить 5 для второго тестового читателя и для ваших старых тестовых записей («yuri», «РКККК» и т.п.) в комментариях и гостевой | в лентах остаётся только то, что вы хотите оставить | |
| 7 | Удалить тестовый рассказ, если создавали | исчез вместе с картинками | |

---

## Часть 3. Перед показом сайта Скрипнику (не сейчас)

- Удалить тестовые аккаунты в Supabase → Authentication → Users → Delete user.
- Подключить свою почту для писем (SMTP) и сделать страницу смены пароля — см. `docs/DEVELOPER.md`, раздел 10.
