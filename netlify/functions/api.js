const serverless = require("serverless-http");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Dimas123";

// Inisialisasi Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Pake secret key, ora anon key
);

const STATUS_LIST = ["Menunggu Verifikasi", "Terverifikasi", "Diterima", "Ditolak"];
const SCHOOL = {
  nama: "SMK Widya Praja Ungaran",
  tagline: "SMK Bisa Hebat!",
  npsn: "20320233",
  akreditasi: "A",
  kepalaSekolah: "Tri Yuliani, S.Pd",
  alamat: "Jl. Jenderal Gatot Subroto No. 63, Bandarjo, Ungaran Barat, Kab. Semarang, Jawa Tengah 50517",
  telepon: "(024) 6923124",
  whatsapp: "0821-4030-1908",
  email: "smk.wpung@yahoo.co.id",
  website: "https://www.smkwidyapraja.sch.id",
  tahunAjaran: "2027/2028",
  jurusan: [
    { kode: "AK", nama: "Akuntansi", kuota: 72, ikon: "📊", deskripsi: "Belajar pembukuan, laporan keuangan, pajak, dan aplikasi akuntansi." },
    { kode: "MP", nama: "Manajemen Perkantoran", kuota: 72, ikon: "🗂️", deskripsi: "Administrasi modern, kearsipan digital, layanan bisnis, dan public speaking." },
    { kode: "BS", nama: "Busana", kuota: 36, ikon: "🧵", deskripsi: "Desain busana, pola, jahit, sampai custom made." },
    { kode: "KL", nama: "Kuliner", kuota: 72, ikon: "🍳", deskripsi: "Pengolahan makanan, pastry bakery, dan kewirausahaan kuliner." },
    { kode: "TO", nama: "Teknik Otomotif", kuota: 72, ikon: "🏍️", deskripsi: "Teknik dan bisnis sepeda motor: servis, tune-up, kelistrikan." },
    { kode: "DKV", nama: "Desain Komunikasi Visual", kuota: 72, ikon: "🎨", deskripsi: "Desain grafis, ilustrasi digital, fotografi, dan konten kreatif." }
  ],
  gelombang: [
    { nama: "Gelombang 1", waktu: "4 Januari – 27 Maret 2027", info: "Pendaftaran awal, pilihan jurusan masih lengkap" },
    { nama: "Gelombang 2", waktu: "29 Maret – 26 Juni 2027", info: "Pendaftaran reguler menjelang kelulusan SMP/MTs" },
    { nama: "Gelombang 3", waktu: "28 Juni – 10 Juli 2027", info: "Pendaftaran sisa kuota" },
    { nama: "Daftar Ulang & MPLS", waktu: "12 – 17 Juli 2027", info: "Herregistrasi siswa diterima dan masa pengenalan sekolah" }
  ],
  syarat: [
    "Fotokopi ijazah / Surat Keterangan Lulus SMP/MTs",
    "Fotokopi rapor semester 1–5",
    "Fotokopi Kartu Keluarga dan akta kelahiran",
    "NISN aktif dan valid",
    "Pas foto 3x4 terbaru (2 lembar)",
    "Mengisi formulir online, lalu verifikasi berkas ke sekolah"
  ]
};

const tokens = new Map();

function auth(req, res, next) {
  const t = (req.headers.authorization || "").replace("Bearer ", "");
  if (!tokens.has(t) || tokens.get(t) < Date.now()) {
    tokens.delete(t);
    return res.status(401).json({ ok: false, pesan: "Sesi habis, silakan login ulang" });
  }
  next();
}

app.use(express.json({ limit: "100kb" }));

app.get("/api/info", async (req, res) => {
  try {
    const { count } = await supabase.from("pendaftar").select("*", { count: "exact", head: true });
    const jurusan = SCHOOL.jurusan.map(j => ({
      ...j,
      terisi: 0 // Nanti bisa diupdate query count per jurusan, sementara 0 dlu
    }));
    res.json({ ...SCHOOL, jurusan, totalPendaftar: count || 0 });
  } catch (err) {
    res.status(500).json({ ok: false, pesan: "Gagal memuat data" });
  }
});

app.post("/api/daftar", async (req, res) => {
  const b = req.body || {};
  const teks = v => String(v || "").trim().slice(0, 300);
  const d = {
    nama: teks(b.nama),
    nisn: teks(b.nisn),
    nik: teks(b.nik),
    tempat_lahir: teks(b.tempatLahir),
    tanggal_lahir: teks(b.tanggalLahir),
    jenis_kelamin: teks(b.jenisKelamin),
    asal_sekolah: teks(b.asalSekolah),
    alamat: teks(b.alamat),
    hp: teks(b.hp),
    email: teks(b.email),
    nama_ortu: teks(b.namaOrtu),
    hp_ortu: teks(b.hpOrtu),
    jurusan1: teks(b.jurusan1),
    jurusan2: teks(b.jurusan2)
  };

  const hpOK = v => /^(?:\+62|62|0)8\d{7,11}$/.test(v);
  const kode = SCHOOL.jurusan.map(j => j.kode);

  if (d.nama.length < 3) return res.status(400).json({ ok: false, pesan: "Nama lengkap minimal 3 huruf" });
  if (!/^\d{10}$/.test(d.nisn)) return res.status(400).json({ ok: false, pesan: "NISN harus 10 digit angka" });
  if (!/^\d{16}$/.test(d.nik)) return res.status(400).json({ ok: false, pesan: "NIK harus 16 digit angka" });
  if (!d.tempat_lahir || !d.tanggal_lahir) return res.status(400).json({ ok: false, pesan: "Tempat dan tanggal lahir wajib diisi" });
  if (!["L", "P"].includes(d.jenis_kelamin)) return res.status(400).json({ ok: false, pesan: "Pilih jenis kelamin" });
  if (d.asal_sekolah.length < 3) return res.status(400).json({ ok: false, pesan: "Asal sekolah wajib diisi" });
  if (d.alamat.length < 10) return res.status(400).json({ ok: false, pesan: "Alamat terlalu singkat" });
  if (!hpOK(d.hp)) return res.status(400).json({ ok: false, pesan: "Nomor HP/WA siswa tidak valid" });
  if (!d.nama_ortu) return res.status(400).json({ ok: false, pesan: "Nama orang tua/wali wajib diisi" });
  if (!hpOK(d.hp_ortu)) return res.status(400).json({ ok: false, pesan: "Nomor HP/WA orang tua tidak valid" });
  if (!kode.includes(d.jurusan1)) return res.status(400).json({ ok: false, pesan: "Pilihan jurusan 1 tidak valid" });
  if (d.jurusan2 && (!kode.includes(d.jurusan2) || d.jurusan2 === d.jurusan1)) return res.status(400).json({ ok: false, pesan: "Pilihan jurusan 2 harus berbeda dari pilihan 1" });
  if (b.setuju !== true) return res.status(400).json({ ok: false, pesan: "Centang pernyataan kebenaran data" });

  // Cek NISN duplikat
  const { data: existing } = await supabase.from("pendaftar").select("nisn").eq("nisn", d.nisn).single();
  if (existing) return res.status(409).json({ ok: false, pesan: "NISN sudah terdaftar. Gunakan menu Cek Status." });

  const tahun = SCHOOL.tahunAjaran.slice(0, 4);
  const { count } = await supabase.from("pendaftar").select("*", { count: "exact", head: true });
  const counter = (count || 0) + 1;
  const nomor = `SPMB-${tahun}-${String(counter).padStart(4, "0")}`;

  const { data, error } = await supabase.from("pendaftar").insert([{
    nomor,
    status: "Menunggu Verifikasi",
    ...d
  }]).select().single();

  if (error) return res.status(500).json({ ok: false, pesan: "Gagal menyimpan data: " + error.message });

  res.json({ ok: true, nomor: data.nomor });
});

app.get("/api/status/:nomor", async (req, res) => {
  const { data, error } = await supabase
    .from("pendaftar")
    .select("*")
    .ilike("nomor", req.params.nomor)
    .single();

  if (error || !data) return res.status(404).json({ ok: false, pesan: "Nomor pendaftaran tidak ditemukan" });

  const nj = k => (SCHOOL.jurusan.find(j => j.kode === k) || {}).nama || k;
  res.json({
    ok: true,
    data: {
      nomor: data.nomor,
      nama: data.nama,
      asalSekolah: data.asal_sekolah,
      jurusan1: nj(data.jurusan1),
      jurusan2: data.jurusan2 ? nj(data.jurusan2) : "-",
      status: data.status,
      tanggalDaftar: data.created_at
    }
  });
});

app.post("/api/admin/login", (req, res) => {
  if ((req.body || {}).password !== ADMIN_PASSWORD) return res.status(401).json({ ok: false, pesan: "Password salah" });
  const token = crypto.randomUUID();
  tokens.set(token, Date.now() + 12 * 3600 * 1000);
  res.json({ ok: true, token });
});

app.get("/api/admin/pendaftar", auth, async (req, res) => {
  const { data, error } = await supabase.from("pendaftar").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ ok: false, pesan: error.message });
  res.json({ ok: true, data: data || [], statusList: STATUS_LIST, jurusan: SCHOOL.jurusan });
});

app.patch("/api/admin/pendaftar/:id", auth, async (req, res) => {
  const { status } = req.body || {};
  if (!STATUS_LIST.includes(status)) return res.status(400).json({ ok: false, pesan: "Status tidak valid" });
  
  const { error } = await supabase.from("pendaftar").update({ status }).eq("id", req.params.id);
  if (error) return res.status(500).json({ ok: false, pesan: error.message });
  
  res.json({ ok: true });
});

app.delete("/api/admin/pendaftar/:id", auth, async (req, res) => {
  const { error } = await supabase.from("pendaftar").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ ok: false, pesan: error.message });
  
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  res.status(400).json({ ok: false, pesan: "Permintaan tidak valid" });
});

exports.handler = serverless(app);