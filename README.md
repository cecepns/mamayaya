# Mamaya ID — Stock Management

Aplikasi manajemen stok dengan 2 role: **Admin** dan **Manager**.

## Role & Akses

| Fitur | Admin | Manager |
|-------|-------|---------|
| Dashboard, Activity | ✅ | ✅ |
| Data Produk | Lihat saja | CRUD + Bulk Insert |
| Barang Masuk | Setujui / Tolak (centang) | Input + Bulk Insert (pending) |
| Barang Keluar | Lihat (tanpa harga modal & aksi) | CRUD penuh |
| Catatan | ✅ | ❌ Hidden |
| Pembukuan | ✅ | ❌ Hidden |
| Manajemen Users | ✅ | ❌ Hidden |

## Alur Barang Masuk

1. **Manager** input barang masuk (single atau bulk insert)
2. Status = **pending** — stok belum bertambah
3. **Admin** centang / approve barang yang sudah datang
4. Status = **approved** — stok otomatis masuk

## Setup

### Database

```bash
mysql -u root -p < backend/mamaya_id.sql
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

### Frontend

```bash
cp .env.example .env
npm install
npm run dev
```

## Default Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mamaya.id | admin12345 |
| Manager | manager@mamaya.id | manager12345 |

## Tech Stack

- Frontend: React + Vite + TailwindCSS + Lucide React
- Backend: Express JS + MySQL
- Auth: JWT
# mamayaya
