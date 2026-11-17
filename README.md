# FanLab Uz — Render

O‘zbek tilidagi interaktiv 3D fizika laboratoriyasi. Barcha sahifalar, 3D JavaScript modullari, Three.js kutubxonasi va rasmlar tiklangan.

## Render’da ishga tushirish

Blueprint: https://dashboard.render.com/blueprint/new?repo=https://github.com/Xojiakbarr7/FanLab

`render.yaml` bitta Node.js Web Service va PostgreSQL bazasini yaratadi. Ikkalasi ham free rejada. Render Dashboard’da ko‘rsatilgan shartlarni tekshirib Apply bosing. Free PostgreSQL muddati va cheklovlarini Dashboard’dan tekshiring; bu doimiy bepul baza kafolati emas.

Qo‘lda yaratilsa:

| Sozlama | Qiymat |
| --- | --- |
| Branch | main |
| Root Directory | bo‘sh |
| Runtime | Node |
| Build Command | npm ci --omit=dev |
| Start Command | npm start |
| Health Check | /healthz |
| NODE_VERSION | 24.22.1 |
| NODE_ENV | production |
| DATABASE_URL | PostgreSQL Internal Database URL |

Server `0.0.0.0` va Render bergan `PORT` orqali ishlaydi. Production’da DATABASE_URL majburiy, yo‘q bo‘lsa server vaqtinchalik bazaga o‘tmaydi. PostgreSQL jadvallari birinchi ishga tushishda avtomatik yaratiladi.

## Hisoblar

Email, ism, ta’lim bosqichi va kamida 8 belgili parol bilan ro‘yxatdan o‘tiladi. Hisob va 30 kunlik sessiya PostgreSQL’da saqlanadi; parollar scrypt bilan xeshlanadi. Chiqish sessiyani bazadan o‘chiradi. HTTPS’da cookie Secure va HttpOnly bo‘ladi. Tajriba qaydlari har bir hisob uchun alohida brauzer xotirasida; qurilmalar orasida sinxronlanmaydi. Email tasdiqlash va parol tiklash hali qo‘shilmagan.

## Mahalliy ishga tushirish

Node.js 24 yoki yangirog‘i kerak.

```sh
npm ci
npm start
```

http://localhost:3000 — DATABASE_URL bo‘lmasa faqat lokal ishlab chiqish uchun `data/fanlab.sqlite` ishlatiladi.

```sh
npm run build
npm test
```

Sinovlar: ro‘yxatdan o‘tish, takror email, noto‘g‘ri parol, chiqish, sessiyaning server qayta ishga tushganda saqlanishi, HTML escaping, tashqi saytdan logout so‘rovini rad etish va asosiy 3D resurslar. Avtomatik sinov SQLite bilan bajariladi; PostgreSQL ulanishi deploydan keyin tekshiriladi.

## Fayllar

- `server.mjs`: Node HTTP server, autentifikatsiya va ma’lumotlar bazasi.
- `legacy/`: laboratoriya HTML sahifalari.
- `public/`: 3D modullar, Three.js, CSS va rasmlar.
- `original-upload/`: oldin GitHub’ga papkalarsiz yuklangan asl fayllar; server ularni tarqatmaydi.

Oldingi ChatGPT/Cloudflare kirishi Render uchun email/parol hisoblariga almashtirilgan. Oldingi platforma hisoblari avtomatik ko‘chirilmaydi.
