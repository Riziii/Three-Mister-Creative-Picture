# Three Mister Create Picture 🎨

Aplikasi pembuatan foto dan ilustrasi AI dengan gaya anime hyper-detailed berkualitas masterpiece, ditenagai oleh Google Gemini API.

## 🚀 Cara Menjalankan Secara Lokal

```bash
# Install dependencies
npm install

# Jalankan server pengembangan
npm run dev
```

Buka peramban di `http://localhost:3000`.

## 🌐 Panduan Deployment ke GitHub Pages

Proyek ini telah dikonfigurasi secara otomatis untuk GitHub Pages:

### Metode 1: Melalui Pengaturan GitHub Pages (Paling Mudah)
1. **Push / Commit** seluruh berkas proyek ini ke branch `main` repositori GitHub Anda.
2. Buka repositori Anda di GitHub: **Settings** > **Pages**.
3. Pada bagian **Build and deployment**:
   - **Source**: Pilih `Deploy from a branch`.
   - **Branch**: Pilih `main` dan pilih folder `/docs`.
   - Klik **Save**.
4. Selesai! Website Anda akan otomatis online dalam 1–2 menit di `https://<username>.github.io/<repository-name>/`.

### Metode 2: Menggunakan Perintah deploy (`gh-pages`)
Jika Anda bekerja dari komputer lokal:
```bash
npm run deploy
```
Perintah ini akan mengompilasi proyek dan mengunggahnya langsung ke branch deployment.
