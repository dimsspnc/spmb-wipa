const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tgl = s => { const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); };

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

const namaJurusan = k => (INFO?.jurusan.find(j => j