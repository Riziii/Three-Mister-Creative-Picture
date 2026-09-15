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

## 🌐 Panduan Deployment ke GitHub Pages (Folder `/docs`)

Folder `/docs` sudah siap pakai dan terkompilasi penuh dengan aset produksi terbaru:

### Langkah Mudah Deployment (Pengaturan GitHub Pages):
1. **Push / Commit** seluruh berkas proyek ke repositori GitHub Anda (bisa langsung melalui tombol Sync/Push di AI Studio).
2. Buka repositori Anda di situs GitHub: masuk ke menu **Settings** > **Pages**.
3. Pada bagian **Build and deployment**:
   - **Source**: Pilih **Deploy from a branch**
   - **Branch**: Pilih `main` (atau `master`)
   - **Folder**: Pilih `/docs`
   - Klik **Save**
4. Selesai! Website Anda akan aktif di `https://<username>.github.io/<repository-name>/` dalam 1–2 menit.

---

### Alternatif: Deployment via `gh-pages` (Komputer Lokal)
```bash
npm run deploy
```

> **Tips Jika Tampilan Belum Berubah**:
> Peramban web sering menyimpan cache halaman lama. Lakukan *hard refresh* dengan menekan `Ctrl + Shift + R` (Windows/Linux) atau `Cmd + Shift + R` (Mac).
