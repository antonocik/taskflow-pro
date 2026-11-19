const STORAGE_KEY = "taskflow-pro:tasks";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  tasks: [],
  filterStatus: "all",
  filterCategory: "all",
  filterPriority: "all",
  search: ""
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.tasks = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.tasks = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function uid() {
  return "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function isOverdue(task) {
  if (!task.due || task.done) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(task.due) < today;
}

function addTask(data) {
  state.tasks.unshift({
    id: uid(),
    title: data.title.trim(),
    category: data.category,
    priority: data.priority,
    due: data.due || "",
    notes: data.notes || "",
    done: false,
    createdAt: new Date().toISOString()
  });
  save();
  render();
}

function updateTask(id, patch) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  Object.assign(t, patch);
  save();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(x => x.id !== id);
  save();
  render();
}

function filteredTasks() {
  const q = state.search.trim().toLowerCase();
  return state.tasks.filter(t => {
    if (state.filterStatus === "active" && t.done) return false;
    if (state.filterStatus === "done" && !t.done) return false;
    if (state.filterCategory !== "all" && t.category !== state.filterCategory) return false;
    if (state.filterPriority !== "all" && t.priority !== state.filterPriority) return false;
    if (q && !`${t.title} ${t.notes} ${t.category}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function priorityLabel(p) {
  return p === "high" ? "Tinggi" : p === "med" ? "Sedang" : "Rendah";
}

function priorityClass(p) {
  return p === "high" ? "badge--high" : p === "med" ? "badge--med" : "badge--low";
}

function categoryLabel(c) {
  return ({ work: "Kerja", personal: "Pribadi", shopping: "Belanja", other: "Lainnya" })[c] || c;
}

function renderStats() {
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.done).length;
  $("#statTotal").textContent = total;
  $("#statDone").textContent = done;
  $("#statPending").textContent = total - done;
}

function renderList() {
  const list = $("#taskList");
  const items = filteredTasks();
  if (!items.length) {
    list.innerHTML = `<li class="empty">Tidak ada tugas yang cocok. Tambahkan tugas baru atau ubah filter.</li>`;
    return;
  }
  list.innerHTML = items.map(t => `
    <li class="task ${t.done ? "done" : ""}" data-id="${t.id}">
      <input type="checkbox" class="task__check" ${t.done ? "checked" : ""} aria-label="Tandai selesai">
      <div>
        <div class="task__title">${escapeHtml(t.title)}</div>
        <div class="task__meta">
          <span class="badge ${priorityClass(t.priority)}">${priorityLabel(t.priority)}</span>
          <span>${categoryLabel(t.category)}</span>
          ${t.due ? `<span ${isOverdue(t) ? 'style="color:#fca5a5"' : ""}>Jatuh tempo: ${formatDate(t.due)}${isOverdue(t) ? " (terlambat)" : ""}</span>` : ""}
          ${t.notes ? `<span>• ${escapeHtml(t.notes)}</span>` : ""}
        </div>
      </div>
      <div class="task__actions">
        <button class="icon-btn" data-action="edit" title="Edit">✎</button>
        <button class="icon-btn" data-action="delete" title="Hapus">✕</button>
      </div>
    </li>
  `).join("");
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function render() {
  renderStats();
  renderList();
}

function resetForm() {
  $("#taskForm").reset();
  $("#taskId").value = "";
  $("#submitBtn").textContent = "Tambah tugas";
}

function openEdit(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  $("#taskId").value = t.id;
  $("#title").value = t.title;
  $("#category").value = t.category;
  $("#priority").value = t.priority;
  $("#due").value = t.due;
  $("#notes").value = t.notes;
  $("#submitBtn").textContent = "Simpan perubahan";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleSubmit(e) {
  e.preventDefault();
  const data = {
    title: $("#title").value,
    category: $("#category").value,
    priority: $("#priority").value,
    due: $("#due").value,
    notes: $("#notes").value
  };
  if (!data.title.trim()) return;
  const id = $("#taskId").value;
  if (id) {
    updateTask(id, data);
  } else {
    addTask(data);
  }
  resetForm();
}

function initEvents() {
  $("#taskForm").addEventListener("submit", handleSubmit);
  $("#cancelEdit").addEventListener("click", resetForm);

  $("#taskList").addEventListener("change", e => {
    if (e.target.classList.contains("task__check")) {
      const id = e.target.closest(".task").dataset.id;
      updateTask(id, { done: e.target.checked });
    }
  });
  $("#taskList").addEventListener("click", e => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.closest(".task").dataset.id;
    if (btn.dataset.action === "delete") deleteTask(id);
    if (btn.dataset.action === "edit") openEdit(id);
  });

  $("#search").addEventListener("input", e => { state.search = e.target.value; render(); });
  $("#filterStatus").addEventListener("change", e => { state.filterStatus = e.target.value; render(); });
  $("#filterCategory").addEventListener("change", e => { state.filterCategory = e.target.value; render(); });
  $("#filterPriority").addEventListener("change", e => { state.filterPriority = e.target.value; render(); });

  $("#clearDone").addEventListener("click", () => {
    state.tasks = state.tasks.filter(t => !t.done);
    save(); render();
  });
  $("#clearAll").addEventListener("click", () => {
    if (state.tasks.length && confirm("Hapus semua tugas?")) {
      state.tasks = []; save(); render();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  initEvents();
  render();
});