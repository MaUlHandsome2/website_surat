# Pengganti Nama Surat Otomatis

Aplikasi web 100% sisi-klien (client-side) untuk membantu Anda mengganti satu target nama di dalam sebuah surat undangan (`.docx` atau `.pdf`) menjadi puluhan nama baru secara otomatis dan aman (tanpa server).

Semua format, logo, kop surat, stempel, dan tanda tangan dari surat yang Anda unggah **tidak akan rusak** atau berubah.

## Cara Pakai

1. Buka `index.html` di browser Anda.
2. **Langkah 1**: Unggah surat master (`.docx` disarankan). Klik "Deteksi Otomatis" atau ketikkan nama yang ingin diganti (contoh: *Budi Santoso*).
3. **Langkah 2**: Masukkan daftar nama baru (satu per baris) ke dalam teks box, atau impor dari Excel. Anda bisa mengatur "sapaan" secara opsional.
4. **Langkah 3**: Lihat pratinjau teksnya, lalu klik "Unduh File ZIP". Aplikasi akan menghasilkan banyak file secara cepat tanpa nge-lag karena diproses di memori browser.

## Tips Menyiapkan Surat DOCX
Bila memungkinkan, selalu gunakan **.docx**. 
- Ketika mengetik nama *placeholder* (nama yang akan diganti) di dalam Microsoft Word, usahakan Anda **tidak salah ketik dan menghapusnya di tengah-tengah kata**, karena Word kadang memecah kode XML di balik layar saat Anda sering mengedit suatu kata.
- Cara paling aman: ketik nama target tersebut di Notepad, lalu *copy-paste* (Teks Saja) ke dalam Microsoft Word, tebalkan/miringkan sesuai selera, lalu Save.

## Catatan untuk Mode PDF
Meskipun aplikasi mendukung file PDF, format PDF tidak mengizinkan teks bergeser (*reflow*). Aplikasi ini menimpa nama lama dengan kotak putih dan menuliskan nama baru.
Jika nama baru terlalu panjang, maka teks bisa menimpa tulisan di sekitarnya. Karenanya, mode DOCX selalu direkomendasikan.

## Meng-hosting di GitHub Pages

Aplikasi ini dapat langsung dipublikasikan:
1. Buat repositori baru di GitHub Anda.
2. Unggah file-file di folder ini (`index.html`, `css`, dan `js`).
3. Masuk ke tab **Settings** repositori Anda.
4. Klik **Pages** di sebelah kiri.
5. Pada menu *Build and deployment*, atur *Source* ke **Deploy from a branch**.
6. Pilih branch **main** (atau master) di dropdown, lalu klik **Save**.
7. Tunggu beberapa menit, situs Anda akan online!
