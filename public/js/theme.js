const root = document.documentElement;

function setTheme(t) {
  root.dataset.theme = t;
  localStorage.setItem("theme", t);
  const b = document.getElementById("themeBtn");
  if (b) b.textContent = t === "dark" ? "☀️" : "🌙";
}
setTheme(root.dataset.theme || "light");
document.getElementById("themeBtn")?.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));

function jam() {
  const el = document.getElementById("clock");
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }) + "  " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
jam();
setInterval(jam, 1000);

function toast(pesan, tipe = "ok") {
  const box = document.getElementById("toasts");
  const t = document.createElement("div");
  t.className = "toast " + tipe;
  t.textContent = (tipe === "err" ? "⚠️ " : "✅ ") + pesan;
  box.appendChild(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 300);
  }, 3500);
}