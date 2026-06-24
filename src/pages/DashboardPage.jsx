import { useEffect, useState } from 'react'
import { Calculator, Loader2 } from 'lucide-react'
import { apiService } from '../utils/api'
import { confirmToast, notifyError, notifySuccess } from '../utils/toast'
import { formatCurrency, formatNumber } from '../utils/format'
import StatCard from '../components/StatCard'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  const loadStats = async () => {
    try {
      setLoading(true)
      const { data } = await apiService.getDashboard()
      setStats(data)
    } catch (error) {
      notifyError(error.response?.data?.message || 'Gagal mengambil statistik dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculateCosts = async () => {
    const accepted = await confirmToast(
      'Hitung ulang harga modal semua barang keluar dengan metode rata-rata stok? Proses ini aman dijalankan ulang.',
      'Ya, hitung ulang',
    )
    if (!accepted) return

    try {
      setRecalculating(true)
      const { data } = await apiService.recalculateInventoryCosts()
      notifySuccess(
        data?.message ||
          `Harga modal berhasil dihitung ulang untuk ${data?.updated_products || 0} produk`,
      )
      await loadStats()
    } catch (error) {
      notifyError(error.response?.data?.message || 'Gagal menghitung ulang harga modal')
    } finally {
      setRecalculating(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  if (loading) {
    return <div className="card p-6 text-sm text-slate-500">Memuat dashboard...</div>
  }

  if (!stats) {
    return <div className="card p-6 text-sm text-rose-600">Data dashboard tidak tersedia.</div>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Produk" value={formatNumber(stats.totalProducts)} />
        <StatCard title="Total Stok Saat Ini" value={formatNumber(stats.totalStock)} />
        <StatCard title="Stok Menipis" value={formatNumber(stats.lowStockCount)} />
        <StatCard title="Nilai Stok" value={formatCurrency(stats.stockValue)} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700">Ringkasan Transaksi</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Barang Masuk</p>
              <p className="text-xl font-semibold text-emerald-800">
                {formatNumber(stats.totalIncomingQty)}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-700">Barang Keluar</p>
              <p className="text-xl font-semibold text-amber-800">
                {formatNumber(stats.totalOutgoingQty)}
              </p>
            </div>
            <div className="rounded-lg bg-sky-50 p-3">
              <p className="text-xs text-sky-700">Total Aktivitas</p>
              <p className="text-xl font-semibold text-sky-800">
                {formatNumber(stats.totalActivities)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700">Stok Minimum</h3>
          <div className="mt-3 space-y-2">
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-sm text-slate-500">Semua stok aman.</p>
            ) : (
              stats.lowStockProducts.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-rose-600">{formatNumber(item.current_stock)}</p>
                    <p className="text-xs text-slate-500">Min: {formatNumber(item.min_stock)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Pembukuan Stok</h3>
            <p className="mt-1 text-sm text-slate-500">
              Hitung ulang harga modal barang keluar berdasarkan rata-rata stok (moving average).
              Jalankan sekali setelah deploy atau jika ada koreksi data transaksi lama.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary inline-flex shrink-0 items-center justify-center gap-2 self-start"
            onClick={handleRecalculateCosts}
            disabled={recalculating}
          >
            {recalculating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
            {recalculating ? 'Menghitung...' : 'Hitung Ulang Modal'}
          </button>
        </div>
      </div>
    </div>
  )
}
