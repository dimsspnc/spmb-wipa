const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tgl = s => { const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); };
const stClass = { "Menunggu Verifikasi": "st-wait", "Terverifikasi": "st-verify", "Diterima": "st-ok", "Ditolak": "st-no" };

let INFO = null;
let lastDaftar = null;

const titles = { beranda: "Beranda", jurusan: "Program Keahlian", alur: "Alur & Syarat", daftar: "Formulir Pendaftaran", cek: "Cek Status" };

function showPage(id) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === id));
  $$("[data-page]").forEach(el => el.classList.toggle("active", el.dataset.page === id));
  $("#winTitle").textContent = (titles[id] || "SPMB") + " — SPMB";
  scrollTo({ top: 0, behavior: "smooth" });
}
$$("[data-page]").forEach(el => el.addEventListener("click", e => {
  e.preventDefault();
  showPage(el.dataset.page);
}));

$("#tlRed").addEventListener("click", () => toast("Jendelanya tidak bisa ditutup, ini website 😄"));
$("#tlYellow").addEventListener("click", () => $(".window").classList.toggle("shaded"));
$("#tlGreen").addEventListener("click", () => $(".window").classList.toggle("zoomed"));

const namaJurusan = k => (INFO?.jurusan.find(j => j.kode === k) || {}).nama || k;

async function loadInfo() {
  try {
    const r = await fetch("/api/info");
    if (!r.ok) throw new Error();
    INFO = await r.json();
    $$(".ta").forEach(el => el.textContent = INFO.tahunAjaran);
    $("#statPendaftar").textContent = INFO.totalPendaftar;
    $("#statKuota").textContent = INFO.jurusan.reduce((a, j) => a + j.kuota, 0);
    $("#infoRows").innerHTML = [
      ["Alamat", INFO.alamat],
      ["Telepon", INFO.telepon],
      ["WhatsApp", INFO.whatsapp],
      ["Email", INFO.email],
      ["Kepala Sekolah", INFO.kepalaSekolah],
      ["NPSN", INFO.npsn]
    ].map(([k, v]) => `<div class="info-row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join("");
    $("#jurusanGrid").innerHTML = INFO.jurusan.map(j => `
      <div class="j-card">
        <div class="j-top"><span class="j-icon">${j.ikon}</span><span class="chip">${esc(j.kode)}</span></div>
        <h3>${esc(j.nama)}</h3>
        <p>${esc(j.deskripsi)}</p>
        <div class="bar"><i style="width:${Math.min(100, Math.round(j.terisi / j.kuota * 100))}%"></i></div>
        <span class="kuota-txt">Terisi ${j.terisi} dari ${j.kuota} kursi</span>
      </div>`).join("");
    const opts = INFO.jurusan.map(j => `<option value="${esc(j.kode)}">${esc(j.nama)}</option>`).join("");
    $("#selJ1").insertAdjacentHTML("beforeend", opts);
    $("#selJ2").insertAdjacentHTML("beforeend", opts);
    $("#alurList").innerHTML = INFO.gelombang.map((g, i) => `
      <div class="step"><span class="step-n">${i + 1}</span><div><b>${esc(g.nama)}</b><small>${esc(g.waktu)} — ${esc(g.info)}</small></div></div>`).join("");
    $("#syaratList").innerHTML = INFO.syarat.map(s => `<li>${esc(s)}</li>`).join("");
  } catch {
    toast("Gagal memuat data sekolah. Pastikan server sudah jalan.", "err");
  }
}
loadInfo();

$("#formDaftar").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  const body = {
    nama: f.nama.value,
    nisn: f.nisn.value,
    nik: f.nik.value,
    tempatLahir: f.tempatLahir.value,
    tanggalLahir: f.tanggalLahir.value,
    jenisKelamin: f.jenisKelamin.value,
    asalSekolah: f.asalSekolah.value,
    alamat: f.alamat.value,
    hp: f.hp.value,
    email: f.email.value,
    namaOrtu: f.namaOrtu.value,
    hpOrtu: f.hpOrtu.value,
    jurusan1: f.jurusan1.value,
    jurusan2: f.jurusan2.value,
    setuju: f.setuju.checked
  };
  const btn = $("#btnDaftar");
  btn.disabled = true;
  btn.textContent = "Mengirim…";
  try {
    const r = await fetch("/api/daftar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error(j.pesan || "Gagal mengirim pendaftaran");
    lastDaftar = { ...body, nomor: j.nomor };
    $("#resNomor").textContent = j.nomor;
    $("#resNama").textContent = body.nama;
    $("#resJurusan").textContent = namaJurusan(body.jurusan1) + (body.jurusan2 ? " / " + namaJurusan(body.jurusan2) : "");
    f.hidden = true;
    $("#daftarIntro").hidden = true;
    $("#daftarResult").hidden = false;
    toast("Pendaftaran berhasil dikirim 🎉");
  } catch (err) {
    toast(err.message, "err");
  }
  btn.disabled = false;
  btn.textContent = "Kirim Pendaftaran 🚀";
});

$("#btnLagi").addEventListener("click", () => {
  $("#formDaftar").reset();
  $("#formDaftar").hidden = false;
  $("#daftarIntro").hidden = false;
  $("#daftarResult").hidden = true;
});

$("#btnCetak").addEventListener("click", () => {
  if (!lastDaftar || !INFO) return;
  const d = lastDaftar;
  const rows = [
    ["Nama Lengkap", d.nama],
    ["NISN", d.nisn],
    ["TTL", d.tempatLahir + ", " + tgl(d.tanggalLahir)],
    ["Asal Sekolah", d.asalSekolah],
    ["Jurusan 1", namaJurusan(d.jurusan1)],
    ["Jurusan 2", d.jurusan2 ? namaJurusan(d.jurusan2) : "-"],
    ["No. HP/WA", d.hp],
    ["Status", "Menunggu Verifikasi"]
  ];
  const w = window.open("", "_blank", "width=720,height=900");
  w.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Bukti ${esc(d.nomor)}</title><style>body{font-family:Arial,sans-serif;color:#111;padding:32px;max-width:640px;margin:auto}h1{font-size:20px;margin:0}p{margin:4px 0;font-size:13px}.nomor{border:2px dashed #333;border-radius:10px;padding:14px;text-align:center;font-size:22px;font-weight:bold;letter-spacing:2px;margin:18px 0}table{width:100%;border-collapse:collapse;font-size:13px}td{padding:7px 4px;border-bottom:1px solid #ddd}td:first-child{width:160px;color:#555}.note{margin-top:18px;font-size:12px;color:#444;line-height:1.6}</style></head><body><h1>${esc(INFO.nama)} — Bukti Pendaftaran SPMB</h1><p>${esc(INFO.alamat)}</p><p>Tahun Ajaran ${esc(INFO.tahunAjaran)}</p><div class="nomor">${esc(d.nomor)}</div><table>${rows.map(r => `<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td></tr>`).join("")}</table><p class="note">Simpan bukti ini. Langkah selanjutnya: bawa berkas persyaratan ke sekolah untuk verifikasi. Cek status secara berkala memakai nomor pendaftaran di website SPMB.</p><script>window.print()<\/script></body></html>`);
  w.document.close();
});

$("#formCek").addEventListener("submit", async e => {
  e.preventDefault();
  const nomor = $("#cekNomor").value.trim();
  try {
    const r = await fetch("/api/status/" + encodeURIComponent(nomor));
    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error(j.pesan || "Data tidak ditemukan");
    const d = j.data;
    $("#cekResult").innerHTML = [
      ["Nomor", `<span class="mono">${esc(d.nomor)}</span>`],
      ["Nama", esc(d.nama)],
      ["Asal Sekolah", esc(d.asalSekolah)],
      ["Jurusan 1", esc(d.jurusan1)],
      ["Jurusan 2", esc(d.jurusan2)],
      ["Tanggal Daftar", esc(tgl(d.tanggalDaftar))],
      ["Status", `<span class="st ${stClass[d.status] || "st-wait"}">${esc(d.status)}</span>`]
    ].map(([k, v]) => `<div class="info-row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join("");
    $("#cekResult").hidden = false;
    toast("Data ditemukan ✅");
  } catch (err) {
    $("#cekResult").hidden = true;
    toast(err.message, "err");
  }
});