import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Download, Upload, Check, X } from 'lucide-react'
import AsyncSelect from 'react-select/async'
import DatePicker from 'react-datepicker'
import * as XLSX from 'xlsx'
import { apiService } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/Modal'
import ApiPagination from '../components/ApiPagination'
import { confirmToast, notifyError, notifySuccess } from '../utils/toast'
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatCalendarDateInput,
  formatCalendarMonthInput,
  getTodayCalendarYMD,
  parseCalendarDateInput,
  parseCalendarMonthInput,
} from '../utils/format'

const initialForm = {
  product_id: '',
  quantity: 1,
  purchase_price: 0,
  reference_no: '',
  notes: '',
  transaction_date: getTodayCalendarYMD(),
}

const createBulkRow = () => ({
  product_id: '',
  product_label: '',
  quantity: 1,
  purchase_price: 0,
  reference_no: '',
  notes: '',
  transaction_date: getTodayCalendarYMD(),
})

const buildProductOption = (item) => ({
  value: item.id,
  label: `${item.code} - ${item.name}`,
  stock: Number(item.current_stock || 0),
  minStock: Number(item.min_stock || 10),
})

const statusBadge = (status) => {
  if (status === 'approved') {
    return <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">Disetujui</span>
  }
  if (status === 'rejected') {
    return <span className="rounded bg-rose-100 px-2 py-1 text-xs text-rose-700">Ditolak</span>
  }
  return <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">Menunggu</span>
}

export default function IncomingPage({ currentUser, products, onChanged }) {
  const { canInputIncoming, canEditIncoming, canApproveIncoming, isAdmin } = useAuth(currentUser)
  const hideFinancial = isAdmin
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(canApproveIncoming ? 'pending' : '')
  const [filterDate, setFilterDate] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [bulkRows, setBulkRows] = useState([createBulkRow()])
  const [selectedIds, setSelectedIds] = useState([])
  const [approving, setApproving] = useState(false)

  const defaultProductOptions = useMemo(
    () => products.slice(0, 20).map(buildProductOption),
    [products],
  )

  const pendingRows = useMemo(() => rows.filter((row) => row.status === 'pending'), [rows])

  const tableColSpan = hideFinancial
    ? canApproveIncoming
      ? 9
      : 8
    : canApproveIncoming
      ? 11
      : 10

  const loadData = async () => {
    try {
      setLoading(true)
      const { data } = await apiService.getIncoming({
        search,
        page,
        limit,
        status: statusFilter || undefined,
        date: filterDate || undefined,
        month: filterDate ? undefined : filterMonth || undefined,
      })
      setRows(data.data)
      setTotalPages(data.meta?.total_pages || 1)
      setTotalItems(data.meta?.total_items || 0)
      if (data.meta?.page && data.meta.page !== page) {
        setPage(data.meta.page)
      }
      setSelectedIds([])
    } catch (error) {
      notifyError(error.response?.data?.message || 'Gagal mengambil data barang masuk')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [search, page, limit, filterMonth, filterDate, statusFilter])

  const handleExport = async () => {
    if (!filterDate && !filterMonth) {
      notifyError('Pilih tanggal atau bulan terlebih dahulu sebelum export Excel')
      return
    }
    try {
      setExporting(true)
      const periodLabel = filterDate || filterMonth
      const { data } = await apiService.getIncoming({
        export: 1,
        status: statusFilter || undefined,
        date: filterDate || undefined,
        month: filterDate ? undefined : filterMonth || undefined,
      })

      const exportRows = data.data || []
      if (!exportRows.length) {
        notifyError(`Tidak ada data barang masuk pada periode ${periodLabel}`)
        return
      }

      const excelRows = exportRows.map((row) => {
        const base = {
          Tanggal: formatDate(row.transaction_date),
          Status: row.status,
          'Kode Produk': row.product_code,
          'Nama Produk': row.product_name,
          Jumlah: Number(row.quantity || 0),
        }
        if (!hideFinancial) {
          base['Harga Beli'] = Number(row.purchase_price || 0)
          base['Total Beli'] = Number(row.total_purchase || 0)
        }
        return {
          ...base,
          Referensi: row.reference_no || '-',
          Catatan: row.notes || '-',
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(excelRows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Barang Masuk')
      XLSX.writeFile(workbook, `barang-masuk-${periodLabel}.xlsx`)
      notifySuccess(`Export Excel barang masuk ${periodLabel} berhasil`)
    } catch (error) {
      notifyError(error.response?.data?.message || 'Gagal export Excel barang masuk')
    } finally {
      setExporting(false)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setForm(initialForm)
    setSelectedProduct(null)
    setModalOpen(false)
  }

  const loadProductOptions = async (inputValue) => {
    try {
      const { data } = await apiService.getProducts({
        search: inputValue || '',
        page: 1,
        limit: 20,
      })
      return (data.data || []).map(buildProductOption)
    } catch {
      return []
    }
  }

  const submitForm = async (event) => {
    event.preventDefault()
    if (!form.product_id) {
      notifyError('Produk wajib dipilih')
      return
    }
    const quantityValue = Number(form.quantity)
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      notifyError('Jumlah harus lebih dari 0')
      return
    }
    try {
      const payload = {
        ...form,
        quantity: quantityValue,
        purchase_price: hideFinancial ? 0 : Number(form.purchase_price || 0),
      }
      if (editing) {
        await apiService.updateIncoming(editing.id, payload)
        notifySuccess('Data barang masuk berhasil diperbarui')
      } else {
        await apiService.createIncoming(payload)
        notifySuccess('Barang masuk diajukan, menunggu persetujuan admin')
      }
      resetForm()
      await loadData()
      onChanged()
    } catch (error) {
      notifyError(error.response?.data?.message || 'Gagal menyimpan barang masuk')
    }
  }

  const submitBulk = async () => {
    const filledRows = bulkRows.filter((row) => row.product_id && Number(row.quantity) > 0)
    if (!filledRows.length) {
      notifyError('Isi minimal 1 baris dengan produk dan jumlah valid')
      return
    }

    try {
      const items = filledRows.map((row) => ({
        product_id: row.product_id,
        quantity: Number(row.quantity),
        purchase_price: hideFinancial ? 0 : Number(row.purchase_price || 0),
        reference_no: row.reference_no,
        notes: row.notes,
        transaction_date: row.transaction_date,
      }))
      const { data } = await apiService.bulkInsertIncoming({ items })
      notifySuccess(data.message || 'Bulk insert berhasil diajukan')
      setBulkOpen(false)
      setBulkRows([createBulkRow()])
      await loadData()
    } catch (error) {
      notifyError(error.response?.data?.message || 'Bulk insert gagal')
    }
  }

  const handleDelete = async (row) => {
    const confirmMessage =
      row.status === 'approved'
        ? `Hapus barang masuk ${row.product_name} yang sudah disetujui? Stok produk akan disesuaikan.`
        : `Hapus pengajuan barang masuk ${row.product_name}?`
    const accepted = await confirmToast(confirmMessage, 'Ya, hapus')
    if (!accepted) return

    try {
      await apiService.deleteIncoming(row.id)
      notifySuccess('Data barang masuk berhasil dihapus')
      await loadData()
      onChanged()
    } catch (error) {
      notifyError(error.response?.data?.message || 'Gagal menghapus barang masuk')
    }
  }

  const handleApprove = async (row) => {
    const accepted = await confirmToast(
      `Setujui barang masuk ${row.product_name} (+${row.quantity})? Stok akan bertambah.`,
      'Ya, setujui',
    )
    if (!accepted) return

    try {
      await apiService.approveIncoming(row.id)
      notifySuccess('Barang masuk disetujui, stok diperbarui')
      await loadData()
      onChanged()
    } catch (error) {
      notifyError(error.response?.data?.message || 'Gagal menyetujui barang masuk')
    }
  }

  const handleReject = async (row) => {
    const accepted = await confirmToast(`Tolak barang masuk ${row.product_name}?`, 'Ya, tolak')
    if (!accepted) return

    try {
      await apiService.rejectIncoming(row.id)
      notifySuccess('Barang masuk ditolak')
      await loadData()
    } catch (error) {
      notifyError(error.response?.data?.message || 'Gagal menolak barang masuk')
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleSelectAllPending = () => {
    const pendingIds = pendingRows.map((row) => row.id)
    if (pendingIds.every((id) => selectedIds.includes(id))) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingIds)
    }
  }

  const handleBulkApprove = async () => {
    if (!selectedIds.length) {
      notifyError('Pilih minimal 1 barang masuk pending')
      return
    }
    const accepted = await confirmToast(
      `Setujui ${selectedIds.length} barang masuk sekaligus? Stok akan diperbarui.`,
      'Ya, setujui semua',
    )
    if (!accepted) return

    try {
      setApproving(true)
      const { data } = await apiService.bulkApproveIncoming({ ids: selectedIds })
      notifySuccess(data.message || 'Bulk approve berhasil')
      await loadData()
      onChanged()
    } catch (error) {
      notifyError(error.response?.data?.message || 'Gagal bulk approve')
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="input sm:w-80"
                placeholder="Cari transaksi..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
              <select
                className="input sm:w-44"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {canApproveIncoming && selectedIds.length > 0 ? (
                <button className="btn-primary" onClick={handleBulkApprove} disabled={approving}>
                  <Check size={16} />
                  {approving ? 'Memproses...' : `Setujui (${selectedIds.length})`}
                </button>
              ) : null}
              <button type="button" className="btn-secondary" onClick={handleExport} disabled={exporting}>
                <Download size={16} />
                {exporting ? 'Export...' : 'Export Excel'}
              </button>
              {canInputIncoming ? (
                <>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setBulkRows([createBulkRow()])
                      setBulkOpen(true)
                    }}
                  >
                    <Upload size={16} />
                    Bulk Insert
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setEditing(null)
                      setForm(initialForm)
                      setSelectedProduct(null)
                      setModalOpen(true)
                    }}
                  >
                    <Plus size={16} />
                    Input Barang Masuk
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {canApproveIncoming ? (
            <p className="text-xs text-slate-500">
              Centang barang yang sudah datang, lalu klik Setujui. Stok baru masuk setelah disetujui.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Input barang masuk akan menunggu persetujuan admin sebelum stok bertambah.
            </p>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-emerald-700 text-white">
            <tr>
              {canApproveIncoming ? (
                <th className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={pendingRows.length > 0 && pendingRows.every((row) => selectedIds.includes(row.id))}
                    onChange={toggleSelectAllPending}
                    disabled={!pendingRows.length}
                  />
                </th>
              ) : null}
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Tanggal</th>
              <th className="px-3 py-2 text-left">Kode</th>
              <th className="px-3 py-2 text-left">Nama Produk</th>
              <th className="px-3 py-2 text-right">Jumlah</th>
              {!hideFinancial ? (
                <>
                  <th className="px-3 py-2 text-right">Harga Beli</th>
                  <th className="px-3 py-2 text-right">Total Beli</th>
                </>
              ) : null}
              <th className="px-3 py-2 text-left">Referensi</th>
              <th className="px-3 py-2 text-left">Input Oleh</th>
              <th className="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={tableColSpan}>
                  Memuat data...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={tableColSpan}>
                  Data barang masuk belum ada.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  {canApproveIncoming ? (
                    <td className="px-3 py-2">
                      {row.status === 'pending' ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleSelect(row.id)}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-3 py-2">{statusBadge(row.status)}</td>
                  <td className="px-3 py-2">{formatDate(row.transaction_date)}</td>
                  <td className="px-3 py-2">{row.product_code}</td>
                  <td className="px-3 py-2">{row.product_name}</td>
                  <td className="px-3 py-2 text-right font-medium text-emerald-700">
                    +{formatNumber(row.quantity)}
                  </td>
                  {!hideFinancial ? (
                    <>
                      <td className="px-3 py-2 text-right">{formatCurrency(row.purchase_price)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCurrency(row.total_purchase)}</td>
                    </>
                  ) : null}
                  <td className="px-3 py-2">{row.reference_no || '-'}</td>
                  <td className="px-3 py-2">{row.created_by_name || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      {canApproveIncoming && row.status === 'pending' ? (
                        <>
                          <button
                            className="rounded p-1 text-emerald-700 hover:bg-emerald-50"
                            title="Setujui"
                            onClick={() => handleApprove(row)}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            className="rounded p-1 text-rose-700 hover:bg-rose-50"
                            title="Tolak"
                            onClick={() => handleReject(row)}
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : null}
                      {canEditIncoming ? (
                        <>
                          <button
                            className="rounded p-1 text-sky-700 hover:bg-sky-50"
                            onClick={() => {
                              setEditing(row)
                              const matchedProduct = products.find(
                                (item) => Number(item.id) === Number(row.product_id),
                              )
                              setForm({
                                product_id: row.product_id,
                                quantity: row.quantity,
                                purchase_price: Number(row.purchase_price || 0),
                                reference_no: row.reference_no || '',
                                notes: row.notes || '',
                                transaction_date: row.transaction_date?.slice(0, 10),
                              })
                              setSelectedProduct(
                                matchedProduct
                                  ? buildProductOption(matchedProduct)
                                  : {
                                      value: row.product_id,
                                      label: `${row.product_code} - ${row.product_name}`,
                                      stock: 0,
                                      minStock: 10,
                                    },
                              )
                              setModalOpen(true)
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="rounded p-1 text-rose-700 hover:bg-rose-50"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <ApiPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          loading={loading}
          onPageChange={(nextPage) => setPage(nextPage)}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit)
            setPage(1)
          }}
        />
      </div>

      <Modal
        title={editing ? 'Edit Barang Masuk' : 'Input Barang Masuk'}
        isOpen={modalOpen}
        onClose={resetForm}
      >
        <form className="space-y-3" onSubmit={submitForm}>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Produk</label>
            <AsyncSelect
              cacheOptions
              defaultOptions={defaultProductOptions}
              loadOptions={loadProductOptions}
              placeholder="Cari produk..."
              value={selectedProduct}
              onChange={(option) => {
                setSelectedProduct(option || null)
                setForm({ ...form, product_id: option?.value || '' })
              }}
              noOptionsMessage={() => 'Produk tidak ditemukan'}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Tanggal</label>
              <DatePicker
                selected={parseCalendarDateInput(form.transaction_date)}
                onChange={(value) =>
                  setForm({ ...form, transaction_date: formatCalendarDateInput(value) })
                }
                dateFormat="yyyy-MM-dd"
                className="input"
                wrapperClassName="w-full"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Jumlah</label>
              <input
                type="number"
                className="input"
                min="1"
                value={form.quantity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    quantity: event.target.value === '' ? '' : Number(event.target.value),
                  })
                }
                required
              />
            </div>
            {!hideFinancial ? (
              <>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Harga Beli</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={form.purchase_price}
                    onChange={(event) => setForm({ ...form, purchase_price: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Total Beli</label>
                  <input
                    type="text"
                    className="input bg-slate-50"
                    value={formatCurrency(Number(form.quantity || 0) * Number(form.purchase_price || 0))}
                    readOnly
                  />
                </div>
              </>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Nomor Referensi / Resi</label>
            <input
              className="input"
              value={form.reference_no}
              onChange={(event) => setForm({ ...form, reference_no: event.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Catatan</label>
            <textarea
              className="input min-h-20"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Batal
            </button>
            <button className="btn-primary" type="submit">
              {editing ? 'Simpan Perubahan' : 'Ajukan Barang Masuk'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="Bulk Insert Barang Masuk"
        isOpen={bulkOpen}
        onClose={() => {
          setBulkOpen(false)
          setBulkRows([createBulkRow()])
        }}
        maxWidth="max-w-6xl"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Semua data bulk insert akan diajukan sebagai pending dan menunggu persetujuan admin.
          </p>
          {bulkRows.map((row, index) => (
            <div key={index} className="rounded border border-slate-200 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Baris #{index + 1}</p>
                <button
                  className="btn-secondary"
                  onClick={() => setBulkRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                  disabled={bulkRows.length === 1}
                >
                  <Trash2 size={16} />
                  Hapus
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">Produk</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions={defaultProductOptions}
                    loadOptions={loadProductOptions}
                    placeholder="Cari produk..."
                    value={
                      row.product_id
                        ? { value: row.product_id, label: row.product_label || String(row.product_id) }
                        : null
                    }
                    onChange={(option) =>
                      setBulkRows((prev) =>
                        prev.map((item, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...item,
                                product_id: option?.value || '',
                                product_label: option?.label || '',
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Jumlah</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    value={row.quantity}
                    onChange={(event) =>
                      setBulkRows((prev) =>
                        prev.map((item, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...item,
                                quantity: event.target.value === '' ? '' : Number(event.target.value),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                {!hideFinancial ? (
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Harga Beli</label>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      value={row.purchase_price}
                      onChange={(event) =>
                        setBulkRows((prev) =>
                          prev.map((item, rowIndex) =>
                            rowIndex === index ? { ...item, purchase_price: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                ) : null}
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Referensi / Resi</label>
                  <input
                    className="input"
                    value={row.reference_no}
                    onChange={(event) =>
                      setBulkRows((prev) =>
                        prev.map((item, rowIndex) =>
                          rowIndex === index ? { ...item, reference_no: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Tanggal</label>
                  <DatePicker
                    selected={parseCalendarDateInput(row.transaction_date)}
                    onChange={(value) =>
                      setBulkRows((prev) =>
                        prev.map((item, rowIndex) =>
                          rowIndex === index
                            ? { ...item, transaction_date: formatCalendarDateInput(value) }
                            : item,
                        ),
                      )
                    }
                    dateFormat="yyyy-MM-dd"
                    className="input"
                    wrapperClassName="w-full"
                  />
                </div>
              </div>
            </div>
          ))}
          <button className="btn-secondary" onClick={() => setBulkRows((prev) => [...prev, createBulkRow()])}>
            <Plus size={16} />
            Tambah Baris
          </button>
          <div className="flex justify-end gap-2">
            <button
              className="btn-secondary"
              onClick={() => {
                setBulkOpen(false)
                setBulkRows([createBulkRow()])
              }}
            >
              Batal
            </button>
            <button className="btn-primary" onClick={submitBulk}>
              Ajukan Bulk Insert
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
