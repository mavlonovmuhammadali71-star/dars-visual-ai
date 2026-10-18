# Dars Vizual AI

O'qituvchilar uchun AI bilan dars materiallari yaratish platformasi.

## Imkoniyatlar

- **Bosh sahifa** — AI bilan savol va rasm promptlari yaratish
- **Slaydlar** — AI yordamida dars prezentatsiyasi yaratish, ko'rish va yuklab olish
- **Dars Race** — O'quvchilar uchun gamifikatsiyalangan test poyngasi
- **Kutubxona** — Dars materiallari, qidiruv va kategoriyalar
- **Profil** — Statistika, yutuqlar va sozlamalar (dark mode)

## O'rnatish

1. VS Code'da bu papkani oching
2. Terminalda quyidagi buyruqlarni bajaring:

```bash
npm install
```

3. `.env` faylini oching va `OPENROUTER_API_KEY` qiymatini haqiqiy kalit bilan almashtiring:
   - [openrouter.ai](https://openrouter.ai) ga kiring
   - Keys bo'limidan yangi kalit yarating
   - `sk-or-v1-...` formatidagi kalitni `.env` fayliga qoying

4. Serverni ishga tushiring:

```bash
npm start
```

5. Brauzerda [localhost:3000](http://localhost:3000) manzilini oching

## Fayllar tuzilishi

```
├── index.html          # Bosh sahifa
├── style.css           # Umumiy dizayn tizimi
├── bosh.css            # Bosh sahifa stillari
├── app.js              # Bosh sahifa logikasi
├── slaydlar.html       # Slayd yaratish
├── slayd.css           # Slayd stillari
├── slayd.js            # Slayd logikasi
├── poyga.html          # Dars Race
├── poyga.css           # Poyga stillari
├── poyga-input.css     # Poyga input stillari
├── poyga.js            # Poyga logikasi
├── kutubxona.html      # Kutubxona
├── kutubxona.css       # Kutubxona stillari
├── kutubxona.js        # Kutubxona logikasi
├── profil.html         # Profil
├── profil.css          # Profil stillari
├── profil.js           # Profil logikasi
├── server.js           # Express server (AI API)
├── .env                # Muhit o'zgaruvchilari
└── package.json        # Loyiha sozlamalari
```

## Texnologiyalar

- Express.js — backend server
- OpenRouter API (openai/gpt-4o-mini) — AI model
- Sof HTML/CSS/JS — frontend (frameworksiz)
- Inter font — Google Fonts

## Eslatma

AI funksiyalari ishlashi uchun OpenRouter API kaliti majburiy. `.env` faylidagi `OPENROUTER_API_KEY` qiymatini almashtiring.
