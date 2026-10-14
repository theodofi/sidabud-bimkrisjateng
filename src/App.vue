<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { call } from './api'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

const columns = [
  { key: 'nama_objek', label: 'Nama Objek Budaya', type: 'text' },
  { key: 'alamat', label: 'Alamat Objek Budaya (Lengkap)', type: 'area' },
  { key: 'jenis_perizinan', label: 'Jenis Perizinan', type: 'text' },
  { key: 'instansi_penerbit', label: 'Instansi Yang Mengeluarkan', type: 'text' },
  { key: 'nomor_tanggal_perizinan', label: 'Nomor dan Tanggal Perizinan', type: 'text' },
  { key: 'tahun_berdiri', label: 'Tahun Berdiri', type: 'text' },
  { key: 'nama_pengelola', label: 'Nama Pengelola Objek Budaya', type: 'text' },
  { key: 'telp_pengelola', label: 'Telp Pengelola', type: 'tel' },
  { key: 'email_pengelola', label: 'Email Pengelola', type: 'email' },
  { key: 'sejarah_singkat', label: 'Sejarah Singkat', type: 'area' },
]

const token = ref(sessionStorage.getItem('idToken') || '')
const user = ref(null)
const kabkotaList = ref([])
const rows = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const filterKab = ref('')
const form = ref(null)
const saving = ref(false)

const isAdmin = computed(() => user.value?.role === 'admin')
const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return rows.value.filter(
    (r) =>
      (!filterKab.value || r.kabkota === filterKab.value) &&
      (!q || columns.some((c) => String(r[c.key] || '').toLowerCase().includes(q)))
  )
})

function logout() {
  sessionStorage.removeItem('idToken')
  token.value = ''
  user.value = null
  rows.value = []
  form.value = null
  nextTick(renderButton)
}

function handleError(e) {
  if (String(e.message).includes('UNAUTHENTICATED')) {
    logout()
    error.value = 'Sesi habis, silakan login kembali.'
  } else {
    error.value = e.message
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const me = await call('me', token.value)
    user.value = me.user
    kabkotaList.value = me.kabkotaList
    rows.value = (await call('list', token.value)).rows
  } catch (e) {
    const msg = String(e.message)
    logout()
    error.value = msg.includes('UNAUTHENTICATED') ? 'Sesi habis, silakan login kembali.' : msg
  } finally {
    loading.value = false
  }
}

function onCredential(resp) {
  token.value = resp.credential
  sessionStorage.setItem('idToken', resp.credential)
  load()
}

function renderButton() {
  const el = document.getElementById('gbtn')
  if (!el || !window.google?.accounts) return setTimeout(renderButton, 300)
  window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential })
  window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'signin_with' })
}

function openForm(row) {
  error.value = ''
  form.value = row
    ? { ...row }
    : { id: '', kabkota: isAdmin.value ? '' : user.value.kabkota, ...Object.fromEntries(columns.map((c) => [c.key, ''])) }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const { row } = await call('save', token.value, { row: form.value })
    const i = rows.value.findIndex((r) => r.id === row.id)
    if (i >= 0) rows.value[i] = row
    else rows.value.push(row)
    form.value = null
  } catch (e) {
    handleError(e)
  } finally {
    saving.value = false
  }
}

async function remove(r) {
  if (!confirm(`Hapus "${r.nama_objek}"?`)) return
  try {
    await call('delete', token.value, { id: r.id })
    rows.value = rows.value.filter((x) => x.id !== r.id)
  } catch (e) {
    handleError(e)
  }
}

onMounted(() => {
  if (token.value) load()
  else renderButton()
})
</script>

<template>
  <div v-if="!user" class="center">
    <div class="card">
      <h2>SIDABUD Bimas Kristen Jawa Tengah</h2>
      <p>Data Objek Keagamaan Kristen — khusus PIC Kab/Kota</p>
      <p v-if="loading">Memuat...</p>
      <div id="gbtn" style="display: flex; justify-content: center" v-show="!loading"></div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>

  <template v-else>
    <header class="top">
      <strong>SIDABUD — Objek Keagamaan Kristen</strong>
      <span>
        {{ user.nama }} ({{ isAdmin ? 'Admin — semua Kab/Kota' : user.kabkota }})
        <button class="ghost" @click="logout">Keluar</button>
      </span>
    </header>
    <main>
      <p v-if="error && !form" class="error">{{ error }}</p>
      <div class="toolbar">
        <input v-model="search" placeholder="Cari..." />
        <select v-if="isAdmin" v-model="filterKab">
          <option value="">Semua Kab/Kota</option>
          <option v-for="k in kabkotaList" :key="k" :value="k">{{ k }}</option>
        </select>
        <button @click="openForm()">+ Tambah Data</button>
        <button class="ghost" @click="load" :disabled="loading">Muat Ulang</button>
      </div>
      <p>{{ filtered.length }} data</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Kab/Kota</th>
              <th v-for="c in columns" :key="c.key">{{ c.label }}</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in filtered" :key="r.id">
              <td>{{ i + 1 }}</td>
              <td>{{ r.kabkota }}</td>
              <td v-for="c in columns" :key="c.key">{{ r[c.key] }}</td>
              <td class="actions">
                <button class="ghost" @click="openForm(r)">Ubah</button>
                <button class="danger" @click="remove(r)">Hapus</button>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td :colspan="columns.length + 3">Belum ada data.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <div v-if="form" class="modal">
      <form class="card" @submit.prevent="save">
        <h3>{{ form.id ? 'Ubah' : 'Tambah' }} Data</h3>
        <label v-if="isAdmin">Kab/Kota</label>
        <select v-if="isAdmin" v-model="form.kabkota" required>
          <option value="" disabled>Pilih Kab/Kota</option>
          <option v-for="k in kabkotaList" :key="k" :value="k">{{ k }}</option>
        </select>
        <template v-for="c in columns" :key="c.key">
          <label>{{ c.label }}</label>
          <textarea v-if="c.type === 'area'" v-model="form[c.key]" rows="3" :required="c.key === 'nama_objek'"></textarea>
          <input v-else v-model="form[c.key]" :type="c.type" :required="c.key === 'nama_objek'" />
        </template>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="form-actions">
          <button type="button" class="ghost" @click="form = null">Batal</button>
          <button :disabled="saving">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
        </div>
      </form>
    </div>
  </template>
</template>
