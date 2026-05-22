/**
 * To-Do Life Dashboard - Main Application
 * Features: Clock/Greeting, Focus Timer, To-Do List, Quick Links,
 *           Dark Mode, Custom Name, Custom Pomodoro Duration,
 *           Duplicate Task Prevention, Task Sorting
 */

// ===================================
// Notification Helper
// ===================================

/**
 * Show a non-blocking toast notification.
 * Auto-hides after 3 seconds.
 * @param {string} message
 * @param {string} [type='info'] - 'info' | 'success' | 'error'
 */
function showNotification(message, type = 'info') {
  const el = document.getElementById('notification');
  if (!el) return;
  el.classList.remove('notification--info', 'notification--success', 'notification--error');
  el.textContent = message;
  el.classList.add('notification--' + type, 'notification--visible');
  if (showNotification._hideTimer) clearTimeout(showNotification._hideTimer);
  showNotification._hideTimer = setTimeout(() => {
    el.classList.remove('notification--visible');
  }, 3000);
}

// ===================================
// Safe Local Storage Utilities
// ===================================

function safeStorageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    if (error.name === 'SecurityError') {
      showNotification('Local Storage is disabled. Data will not be saved.', 'error');
    } else {
      console.error('Error reading from Local Storage, resetting to fallback:', error);
    }
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      showNotification('Storage is full. Please delete some tasks or links.', 'error');
    } else if (error.name === 'SecurityError') {
      showNotification('Local Storage is disabled. Data will not be saved.', 'error');
    } else {
      console.error('Error writing to Local Storage:', error);
    }
    return false;
  }
}

// ===================================
// Settings Module
// ===================================

const Settings = {
  STORAGE_KEY: 'dashboard_settings',

  defaults: {
    theme: 'light',
    customName: '',
    pomodoroDuration: 25
  },

  data: {},

  init() {
    this.data = safeStorageGet(this.STORAGE_KEY, { ...this.defaults });
    // Fill in any missing keys from defaults
    for (const key of Object.keys(this.defaults)) {
      if (this.data[key] === undefined) this.data[key] = this.defaults[key];
    }

    this.applyTheme(this.data.theme);

    // Wire up settings panel toggle
    const toggleBtn = document.getElementById('settings-toggle');
    const closeBtn = document.getElementById('settings-close');
    const panel = document.getElementById('settings-panel');

    toggleBtn.addEventListener('click', () => this.openPanel());
    closeBtn.addEventListener('click', () => this.closePanel());

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!panel.hidden &&
          !panel.contains(e.target) &&
          e.target !== toggleBtn) {
        this.closePanel();
      }
    });

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.setAttribute('aria-checked', String(this.data.theme === 'dark'));
    themeToggle.addEventListener('click', () => this.toggleTheme());

    // Custom name input
    const nameInput = document.getElementById('custom-name');
    nameInput.value = this.data.customName;
    nameInput.addEventListener('input', () => {
      this.data.customName = nameInput.value.trim();
      this.save();
      // Force greeting refresh
      lastDisplayedHour = -1;
      updateTime();
    });

    // Pomodoro duration input
    const durationInput = document.getElementById('pomodoro-duration');
    durationInput.value = this.data.pomodoroDuration;
    durationInput.addEventListener('change', () => {
      const val = parseInt(durationInput.value, 10);
      if (!isNaN(val) && val >= 1 && val <= 120) {
        this.data.pomodoroDuration = val;
        this.save();
        // Update timer if it's stopped
        if (Timer.currentState === Timer.State.STOPPED || Timer.currentState === Timer.State.COMPLETED) {
          Timer.DEFAULT_TIME = val * 60;
          Timer.timeRemaining = Timer.DEFAULT_TIME;
          Timer.updateDisplay();
          Timer.updateStateDisplay();
        } else {
          showNotification('Duration will apply after the current session is reset.', 'info');
        }
      } else {
        durationInput.value = this.data.pomodoroDuration;
        showNotification('Duration must be between 1 and 120 minutes.', 'error');
      }
    });
  },

  openPanel() {
    const panel = document.getElementById('settings-panel');
    const toggleBtn = document.getElementById('settings-toggle');
    panel.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.getElementById('settings-close').focus();
  },

  closePanel() {
    const panel = document.getElementById('settings-panel');
    const toggleBtn = document.getElementById('settings-toggle');
    panel.hidden = true;
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.focus();
  },

  toggleTheme() {
    this.data.theme = this.data.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(this.data.theme);
    document.getElementById('theme-toggle').setAttribute('aria-checked', String(this.data.theme === 'dark'));
    this.save();
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  },

  getCustomName() {
    return this.data.customName || '';
  },

  getPomodoroDuration() {
    return this.data.pomodoroDuration || 25;
  },

  save() {
    safeStorageSet(this.STORAGE_KEY, this.data);
  }
};

// ===================================
// Clock Component
// ===================================

let lastDisplayedDay = -1;

function updateDate() {
  const now = new Date();
  const currentDay = now.getDate();
  if (currentDay !== lastDisplayedDay) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', options);
    lastDisplayedDay = currentDay;
  }
}

/**
 * Returns greeting string, optionally personalised with a name.
 * @param {number} hour - 0-23
 * @param {string} [name] - optional custom name
 * @returns {string}
 */
function getGreeting(hour, name) {
  let base;
  if (hour >= 0 && hour < 5)       base = 'Good Night';
  else if (hour >= 5 && hour < 12) base = 'Good Morning';
  else if (hour >= 12 && hour < 18) base = 'Good Afternoon';
  else                              base = 'Good Evening';

  return name ? base + ', ' + name + '!' : base;
}

let lastDisplayedHour = -1;

function updateTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  document.getElementById('time').textContent =
    String(hours).padStart(2, '0') + ':' +
    String(minutes).padStart(2, '0') + ':' +
    String(seconds).padStart(2, '0');

  if (hours !== lastDisplayedHour) {
    const name = Settings.getCustomName();
    document.getElementById('greeting').textContent = getGreeting(hours, name);
    lastDisplayedHour = hours;
  }

  updateDate();
}

// ===================================
// Timer Component
// ===================================

const Timer = {
  DEFAULT_TIME: 25 * 60,

  State: {
    STOPPED: 'stopped',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed'
  },

  timeRemaining: 25 * 60,
  currentState: 'stopped',
  intervalId: null,
  startTime: null,

  init() {
    // Apply saved pomodoro duration
    this.DEFAULT_TIME = Settings.getPomodoroDuration() * 60;
    this.timeRemaining = this.DEFAULT_TIME;

    this.displayEl = document.getElementById('timer-display');
    this.stateEl = document.getElementById('timer-state');
    this.startBtn = document.getElementById('start-btn');
    this.pauseBtn = document.getElementById('pause-btn');
    this.resetBtn = document.getElementById('reset-btn');

    this.startBtn.addEventListener('click', () => this.start());
    this.pauseBtn.addEventListener('click', () => this.pause());
    this.resetBtn.addEventListener('click', () => this.reset());

    this.updateDisplay();
    this.updateStateDisplay();
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  },

  updateDisplay() {
    if (this.currentState === this.State.COMPLETED) {
      this.displayEl.textContent = "Time's up!";
    } else {
      this.displayEl.textContent = this.formatTime(this.timeRemaining);
    }
  },

  updateStateDisplay() {
    const stateMap = {
      stopped: 'Stopped', running: 'Running',
      paused: 'Paused', completed: 'Completed'
    };
    this.stateEl.textContent = stateMap[this.currentState];
    const label = this.currentState === this.State.COMPLETED
      ? 'Timer completed'
      : stateMap[this.currentState] + ' timer: ' + this.formatTime(this.timeRemaining);
    this.displayEl.setAttribute('aria-label', label);
  },

  start() {
    if (this.currentState === this.State.RUNNING) return;
    if (this.currentState === this.State.COMPLETED) {
      this.timeRemaining = this.DEFAULT_TIME;
    }
    // If resuming from pause, recalculate startTime so elapsed is correct
    this.startTime = Date.now() - (this.DEFAULT_TIME - this.timeRemaining) * 1000;
    this.currentState = this.State.RUNNING;
    this.updateStateDisplay();

    this.intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      this.timeRemaining = Math.max(0, this.DEFAULT_TIME - elapsed);
      this.updateDisplay();
      if (this.timeRemaining <= 0) this.complete();
    }, 1000);
  },

  pause() {
    if (this.currentState !== this.State.RUNNING) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.timeRemaining = Math.max(0, this.DEFAULT_TIME - elapsed);
    this.currentState = this.State.PAUSED;
    this.updateStateDisplay();
  },

  reset() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    this.timeRemaining = this.DEFAULT_TIME;
    this.currentState = this.State.STOPPED;
    this.updateDisplay();
    this.updateStateDisplay();
  },

  complete() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    this.timeRemaining = 0;
    this.currentState = this.State.COMPLETED;
    this.updateDisplay();
    this.updateStateDisplay();
    showNotification("Time's up! Great work.", 'success');
  },

  getState() { return this.currentState; },
  getTime()  { return this.timeRemaining; }
};

// ===================================
// TodoList Component
// ===================================

const TodoList = {
  STORAGE_KEY: 'todo_tasks',
  tasks: [],
  sortOrder: 'default',

  init() {
    this.inputEl  = document.getElementById('todo-input');
    this.addBtn   = document.getElementById('add-task-btn');
    this.listEl   = document.getElementById('todo-list');
    this.sortSel  = document.getElementById('sort-select');

    this.addBtn.addEventListener('click', () => this.handleAddTask());
    this.inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddTask();
    });

    // Sort change
    this.sortSel.addEventListener('change', () => {
      this.sortOrder = this.sortSel.value;
      this.render();
    });

    // Event delegation — delete
    this.listEl.addEventListener('click', (e) => {
      const li = e.target.closest('.todo-item');
      if (!li) return;
      if (e.target.classList.contains('delete-btn')) {
        this.deleteTask(li.dataset.id);
      }
    });

    // Event delegation — checkbox
    this.listEl.addEventListener('change', (e) => {
      if (e.target.classList.contains('todo-checkbox')) {
        const li = e.target.closest('.todo-item');
        this.toggleTask(li.dataset.id);
      }
    });

    // Event delegation — inline edit (click on text)
    this.listEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('task-text') && !e.target.classList.contains('editing')) {
        const li = e.target.closest('.todo-item');
        this.startEditing(li.dataset.id);
      }
    });

    this.listEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('task-text') && e.target.classList.contains('editing')) {
        e.target.blur();
      }
    });

    this.listEl.addEventListener('blur', (e) => {
      if (e.target.classList.contains('task-text') && e.target.classList.contains('editing')) {
        const li = e.target.closest('.todo-item');
        this.finishEditing(li.dataset.id, e.target.value.trim());
      }
    }, true);

    this.load();
    this.render();
  },

  load() {
    this.tasks = safeStorageGet(this.STORAGE_KEY, []);
  },

  save() {
    safeStorageSet(this.STORAGE_KEY, this.tasks);
  },

  validateTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return { isValid: false, message: 'Task cannot be empty' };
    if (trimmed.length > 500) return { isValid: false, message: 'Task cannot exceed 500 characters' };
    return { isValid: true, message: '' };
  },

  /**
   * Check for duplicate task text (case-insensitive).
   * @param {string} text
   * @param {string} [excludeId] - task id to exclude (for edits)
   * @returns {boolean}
   */
  isDuplicate(text, excludeId) {
    const normalized = text.trim().toLowerCase();
    return this.tasks.some(t =>
      t.id !== excludeId && t.text.toLowerCase() === normalized
    );
  },

  addTask(text) {
    const validation = this.validateTask(text);
    if (!validation.isValid) return { success: false, message: validation.message };

    if (this.isDuplicate(text)) {
      return { success: false, message: 'This task already exists.' };
    }

    const task = {
      id: String(Date.now()),
      text: text.trim(),
      completed: false,
      createdAt: Date.now()
    };

    this.tasks.push(task);
    this.save();
    this.render();
    return { success: true };
  },

  handleAddTask() {
    const result = this.addTask(this.inputEl.value);
    if (result.success) {
      this.inputEl.value = '';
    } else {
      showNotification(result.message, 'error');
    }
  },

  editTask(id, text) {
    const validation = this.validateTask(text);
    if (!validation.isValid) return { success: false, message: validation.message };

    if (this.isDuplicate(text, id)) {
      return { success: false, message: 'A task with this name already exists.' };
    }

    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return { success: false, message: 'Task not found' };

    this.tasks[idx].text = text.trim();
    this.save();
    this.render();
    return { success: true };
  },

  startEditing(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;
    const li = this.listEl.querySelector(`li[data-id="${id}"]`);
    const span = li.querySelector('.task-text');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-text editing';
    input.value = task.text;
    span.replaceWith(input);
    input.focus();
    input.select();
  },

  finishEditing(id, newText) {
    const result = this.editTask(id, newText);
    if (!result.success) {
      showNotification(result.message, 'error');
      this.startEditing(id);
    }
  },

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    this.save();
    this.render();
  },

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.save();
    this.render();
  },

  getTasks() { return [...this.tasks]; },

  /**
   * Return a sorted copy of tasks based on current sortOrder.
   * The original this.tasks array is never mutated by sorting.
   */
  getSortedTasks() {
    const copy = [...this.tasks];
    switch (this.sortOrder) {
      case 'az':
        return copy.sort((a, b) => a.text.localeCompare(b.text));
      case 'za':
        return copy.sort((a, b) => b.text.localeCompare(a.text));
      case 'active':
        return copy.sort((a, b) => Number(a.completed) - Number(b.completed));
      case 'completed':
        return copy.sort((a, b) => Number(b.completed) - Number(a.completed));
      default:
        return copy; // insertion order
    }
  },

  render() {
    this.listEl.innerHTML = '';
    const sorted = this.getSortedTasks();

    sorted.forEach(task => {
      const li = document.createElement('li');
      li.className = 'todo-item' + (task.completed ? ' completed' : '');
      li.dataset.id = task.id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label',
        task.completed
          ? 'Mark "' + task.text + '" as incomplete'
          : 'Mark "' + task.text + '" as complete'
      );

      const textSpan = document.createElement('span');
      textSpan.className = 'task-text';
      textSpan.textContent = task.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.setAttribute('aria-label', 'Delete task "' + task.text + '"');

      li.appendChild(checkbox);
      li.appendChild(textSpan);
      li.appendChild(deleteBtn);
      this.listEl.appendChild(li);
    });
  }
};

// ===================================
// QuickLinks Component
// ===================================

const QuickLinks = {
  STORAGE_KEY: 'todo_links',
  links: [],

  init() {
    this.nameEl = document.getElementById('link-name');
    this.urlEl  = document.getElementById('link-url');
    this.addBtn = document.getElementById('add-link-btn');
    this.listEl = document.getElementById('links-list');

    this.addBtn.addEventListener('click', () => this.handleAddLink());
    this.nameEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleAddLink(); });
    this.urlEl.addEventListener('keypress',  (e) => { if (e.key === 'Enter') this.handleAddLink(); });

    this.listEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('link-delete-btn')) {
        const item = e.target.closest('.link-item');
        if (item) this.deleteLink(item.dataset.id);
      }
    });

    this.load();
    this.renderLinks();
  },

  load() {
    this.links = safeStorageGet(this.STORAGE_KEY, []);
  },

  save() {
    safeStorageSet(this.STORAGE_KEY, this.links);
  },

  validateLink(name, url) {
    const n = name.trim();
    if (!n) return { isValid: false, message: 'Link name cannot be empty' };
    if (n.length > 50) return { isValid: false, message: 'Link name cannot exceed 50 characters' };

    const u = url.trim();
    if (!u) return { isValid: false, message: 'URL cannot be empty' };
    if (u.length > 2048) return { isValid: false, message: 'URL cannot exceed 2048 characters' };
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      return { isValid: false, message: 'URL must start with http:// or https://' };
    }
    try { new URL(u); } catch {
      return { isValid: false, message: 'Please enter a valid URL' };
    }
    return { isValid: true, message: '' };
  },

  addLink(name, url) {
    const v = this.validateLink(name, url);
    if (!v.isValid) return { success: false, message: v.message };

    this.links.push({ id: String(Date.now()), name: name.trim(), url: url.trim() });
    this.save();
    this.renderLinks();
    return { success: true };
  },

  handleAddLink() {
    const result = this.addLink(this.nameEl.value, this.urlEl.value);
    if (result.success) {
      this.nameEl.value = '';
      this.urlEl.value = '';
    } else {
      showNotification(result.message, 'error');
    }
  },

  deleteLink(id) {
    this.links = this.links.filter(l => l.id !== id);
    this.save();
    this.renderLinks();
  },

  getLinks() { return [...this.links]; },

  renderLinks() {
    this.listEl.innerHTML = '';
    this.links.forEach(link => {
      const item = document.createElement('div');
      item.className = 'link-item';
      item.dataset.id = link.id;
      item.setAttribute('role', 'listitem');

      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'link-btn';
      anchor.textContent = link.name;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'link-delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.setAttribute('aria-label', 'Delete link "' + link.name + '"');

      item.appendChild(anchor);
      item.appendChild(deleteBtn);
      this.listEl.appendChild(item);
    });
  }
};

// ===================================
// Application Initialization
// ===================================

document.addEventListener('DOMContentLoaded', () => {
  // Settings must init first (theme + name + duration needed by other modules)
  Settings.init();

  // Clock
  updateDate();
  updateTime();
  setInterval(updateTime, 1000);

  // Timer (reads pomodoro duration from Settings)
  Timer.init();

  // Todo list
  TodoList.init();

  // Quick links
  QuickLinks.init();
});
