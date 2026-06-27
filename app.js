const STORAGE_KEY = 'task-tracker-tasks';

let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let filter = 'all';

const form = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const dueInput = document.getElementById('due-input');
const linkInput = document.getElementById('link-input');
const taskList = document.getElementById('task-list');
const footer = document.getElementById('footer');
const remaining = document.getElementById('remaining');
const summary = document.getElementById('summary');
const clearBtn = document.getElementById('clear-completed');

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function dueLabel(dateStr, completed) {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((due - today) / 86400000);

  let cls = 'task-due';
  let label = '';

  if (completed) {
    cls += ' done-due';
    label = `Due ${due.toLocaleDateString()}`;
  } else if (diff < 0) {
    cls += ' overdue';
    label = `Overdue by ${-diff} day${-diff !== 1 ? 's' : ''}`;
  } else if (diff === 0) {
    cls += ' due-soon';
    label = 'Due today';
  } else if (diff === 1) {
    cls += ' due-soon';
    label = 'Due tomorrow';
  } else {
    label = `Due ${due.toLocaleDateString()}`;
  }

  return `<span class="${cls}">${label}</span>`;
}

function linkLabel(url) {
  if (!url) return '';
  let display;
  try {
    display = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    display = 'link';
  }
  return `<a class="task-link" href="${escAttr(url)}" target="_blank" rel="noopener noreferrer">${escHtml(display)}</a>`;
}

function render() {
  const visible = tasks.filter(t =>
    filter === 'all' ? true :
    filter === 'active' ? !t.completed :
    t.completed
  );

  if (visible.length === 0) {
    taskList.innerHTML = `<li class="empty">${
      filter === 'completed' ? 'No completed tasks yet.' :
      filter === 'active' ? 'No active tasks — add one above!' :
      'No tasks yet. Add one above!'
    }</li>`;
  } else {
    taskList.innerHTML = visible.map(t => {
      const meta = [dueLabel(t.due, t.completed), linkLabel(t.link)].filter(Boolean).join('');
      return `
        <li class="task-item${t.completed ? ' completed' : ''}" data-id="${t.id}">
          <button class="star-btn${t.completed ? ' starred' : ''}" aria-label="Mark complete">★</button>
          <div class="task-body">
            <div class="task-text">${escHtml(t.text)}</div>
            ${meta ? `<div class="task-meta">${meta}</div>` : ''}
          </div>
          <button class="delete-btn" aria-label="Delete task">✕</button>
        </li>
      `;
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

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  tasks.unshift({
    id: Date.now(),
    text,
    due: dueInput.value,
    link: linkInput.value.trim(),
    completed: false
  });
  taskInput.value = '';
  dueInput.value = '';
  linkInput.value = '';
  save();
  render();
  taskInput.focus();
});

taskList.addEventListener('click', e => {
  if (e.target.classList.contains('star-btn')) {
    const id = Number(e.target.closest('.task-item').dataset.id);
    const t = tasks.find(t => t.id === id);
    if (t) { t.completed = !t.completed; save(); render(); }
    return;
  }
  if (e.target.classList.contains('delete-btn')) {
    const id = Number(e.target.closest('.task-item').dataset.id);
    tasks = tasks.filter(t => t.id !== id);
    save();
    render();
  }
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

clearBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.completed);
  save();
  render();
});

render();
