const firebaseConfig = {
  apiKey: "AIzaSyBTRS8lU9ZT9P7R1erQSvG3QlpjgY3BB-A",
  authDomain: "list-app-f6410.firebaseapp.com",
  projectId: "list-app-f6410",
  storageBucket: "list-app-f6410.firebasestorage.app",
  messagingSenderId: "852133689674",
  appId: "1:852133689674:web:636da0d065700d2f00a9b3"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const tasksCol = db.collection('tasks');

// ── Current user ──────────────────────────────────────────────
let currentUser = sessionStorage.getItem('list-user');

const picker = document.getElementById('user-picker');
const app = document.getElementById('app');

function setUser(name) {
  currentUser = name;
  sessionStorage.setItem('list-user', name);
  picker.style.display = 'none';
  app.style.display = 'block';
  document.getElementById('assignee-input').value = name;
  startListening();
}

if (currentUser) {
  picker.style.display = 'none';
  app.style.display = 'block';
  document.getElementById('assignee-input').value = currentUser;
}

document.querySelectorAll('.picker-btn').forEach(btn => {
  btn.addEventListener('click', () => setUser(btn.dataset.user));
});

// ── State ─────────────────────────────────────────────────────
let tasks = [];
let filter = 'all';
let personFilter = 'all';
let tagFilter = null;
let sortBy = 'created';

// ── DOM refs ──────────────────────────────────────────────────
const form = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const dueInput = document.getElementById('due-input');
const linkInput = document.getElementById('link-input');
const assigneeInput = document.getElementById('assignee-input');
const tagsInput = document.getElementById('tags-input');
const taskList = document.getElementById('task-list');
const footer = document.getElementById('footer');
const remaining = document.getElementById('remaining');
const summary = document.getElementById('summary');
const clearBtn = document.getElementById('clear-completed');
const tagFilterBar = document.getElementById('tag-filter-bar');

// ── Firestore listener ────────────────────────────────────────
function startListening() {
  tasksCol.orderBy('createdAt', 'desc').onSnapshot(snap => {
    tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
}

if (currentUser) startListening();

// ── Helpers ───────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  return String(str).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function parseTags(str) {
  return str.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
}

function dueLabel(dateStr, completed) {
  if (!dateStr) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((due - today) / 86400000);
  let cls = 'task-due', label = '';
  if (completed) { cls += ' done-due'; label = `Due ${due.toLocaleDateString()}`; }
  else if (diff < 0) { cls += ' overdue'; label = `Overdue by ${-diff} day${-diff!==1?'s':''}`; }
  else if (diff === 0) { cls += ' due-soon'; label = 'Due today'; }
  else if (diff === 1) { cls += ' due-soon'; label = 'Due tomorrow'; }
  else { label = `Due ${due.toLocaleDateString()}`; }
  return `<span class="${cls}">${label}</span>`;
}

function linkLabel(url) {
  if (!url) return '';
  let display;
  try { display = new URL(url).hostname.replace(/^www\./, ''); } catch { display = 'link'; }
  return `<a class="task-link" href="${escAttr(url)}" target="_blank" rel="noopener noreferrer">${escHtml(display)}</a>`;
}

function getSorted(list) {
  if (sortBy === 'due') {
    return [...list].sort((a, b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
    });
  }
  return list; // already sorted by createdAt desc from Firestore
}

// ── Render ────────────────────────────────────────────────────
function render() {
  const allTags = [...new Set(tasks.flatMap(t => t.tags || []))].sort();

  tagFilterBar.innerHTML = allTags.map(tag =>
    `<button class="tag-filter-chip${tagFilter === tag ? ' active' : ''}" data-tag="${escAttr(tag)}">#${escHtml(tag)}</button>`
  ).join('');

  const visible = getSorted(tasks.filter(t => {
    if (filter === 'active' && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;
    if (personFilter !== 'all' && t.assignee !== personFilter) return false;
    if (tagFilter && !(t.tags || []).includes(tagFilter)) return false;
    return true;
  }));

  if (visible.length === 0) {
    taskList.innerHTML = `<li class="empty">No tasks here.</li>`;
  } else {
    taskList.innerHTML = visible.map(t => {
      const tagChips = (t.tags || []).map(tag =>
        `<span class="tag-chip" data-tag="${escAttr(tag)}">#${escHtml(tag)}</span>`
      ).join('');
      const meta = [
        `<span class="assignee-badge">${escHtml(t.assignee || '')}</span>`,
        `<input class="due-edit" type="date" data-id="${t.id}" value="${escAttr(t.due || '')}" title="Edit due date" />`,
        dueLabel(t.due, t.completed),
        linkLabel(t.link),
        tagChips
      ].filter(Boolean).join('');
      return `
        <li class="task-item${t.completed ? ' completed' : ''}" data-id="${t.id}">
          <button class="star-btn${t.completed ? ' starred' : ''}" aria-label="Toggle complete">★</button>
          <div class="task-body">
            <div class="task-text">${escHtml(t.text)}</div>
            <div class="task-meta">${meta}</div>
          </div>
          <button class="delete-btn" aria-label="Delete">✕</button>
        </li>`;
    }).join('');
  }

  const active = tasks.filter(t => !t.completed).length;
  const total = tasks.length;
  const done = total - active;
  remaining.textContent = `${active} task${active !== 1 ? 's' : ''} remaining`;
  summary.textContent = total === 0 ? '' : `${done} of ${total} completed`;
  footer.classList.toggle('hidden', total === 0);
  clearBtn.style.visibility = done > 0 ? 'visible' : 'hidden';
}

// ── Events ────────────────────────────────────────────────────
form.addEventListener('submit', e => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  tasksCol.add({
    text,
    due: dueInput.value,
    link: linkInput.value.trim(),
    assignee: assigneeInput.value,
    tags: parseTags(tagsInput.value),
    completed: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  taskInput.value = '';
  dueInput.value = '';
  linkInput.value = '';
  tagsInput.value = '';
  taskInput.focus();
});

taskList.addEventListener('click', e => {
  const item = e.target.closest('.task-item');
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.classList.contains('star-btn')) {
    const t = tasks.find(t => t.id === id);
    if (t) tasksCol.doc(id).update({ completed: !t.completed });
    return;
  }
  if (e.target.classList.contains('delete-btn')) {
    tasksCol.doc(id).delete();
    return;
  }
  if (e.target.classList.contains('tag-chip')) {
    const tag = e.target.dataset.tag;
    tagFilter = tagFilter === tag ? null : tag;
    render();
  }
});

// Inline due date editing
taskList.addEventListener('change', e => {
  if (!e.target.classList.contains('due-edit')) return;
  const id = e.target.dataset.id;
  tasksCol.doc(id).update({ due: e.target.value });
});

tagFilterBar.addEventListener('click', e => {
  if (!e.target.classList.contains('tag-filter-chip')) return;
  const tag = e.target.dataset.tag;
  tagFilter = tagFilter === tag ? null : tag;
  render();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

document.querySelectorAll('.person-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    personFilter = btn.dataset.person;
    document.querySelectorAll('.person-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sortBy = btn.dataset.sort;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

clearBtn.addEventListener('click', () => {
  const completed = tasks.filter(t => t.completed);
  const batch = db.batch();
  completed.forEach(t => batch.delete(tasksCol.doc(t.id)));
  batch.commit();
});
