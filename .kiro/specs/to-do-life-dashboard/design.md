# Design Document: To-Do Life Dashboard

## Overview

The To-Do Life Dashboard is a standalone web application that consolidates productivity tools into a single view. It provides users with a clock display with time-based greetings, a 25-minute focus timer (Pomodoro technique), task management with persistent storage, and quick access links to favorite websites.

This design follows a requirements-first approach, implementing all specified acceptance criteria using vanilla JavaScript, HTML, and CSS without external frameworks or backend dependencies.

### Key Design Decisions

1. **Single-page application** - All components rendered in one HTML file for simplicity
2. **Modular JavaScript structure** - Separate concerns for clock, timer, todo, and links
3. **Local Storage persistence** - All data stored client-side using browser Local Storage API
4. **Event-driven architecture** - User interactions trigger immediate state updates and saves
5. **No framework dependencies** - Pure vanilla JavaScript for maximum compatibility

---

## Architecture

### Application Structure

```
to-do-life-dashboard/
├── index.html          # Main HTML structure
├── css/
│   └── style.css       # All styling
└── js/
    └── app.js          # Application logic
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    To-Do Life Dashboard                  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Clock     │  │ Timer        │  │ Quick Links  │  │
│  │  Component   │  │ Component    │  │  Component   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              To-Do List Component                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    Local Storage                         │
│  (tasks, links, timer state)                           │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Event Handler → State Update → UI Render → Local Storage Save
                                    ↑
                              Optional: State restoration from Local Storage on page load
```

---

## Components and Interfaces

### 1. Clock Component

**Responsibilities:**
- Display current time in HH:MM:SS format
- Display current date in human-readable format
- Show time-based greeting message
- Update every second

**Public API:**

```javascript
// Initialize clock component
Clock.init();

// Internal functions (not exposed)
- updateTime()      // Updates time display
- updateDate()      // Updates date display  
- getGreeting()     // Returns greeting based on current hour
```

**HTML Structure:**
```html
<div class="clock-container">
  <h1 id="greeting">Good Morning</h1>
  <div id="time">00:00:00</div>
  <div id="date">Monday, January 1, 2025</div>
</div>
```

**Greeting Logic:**
| Time Range | Greeting |
|------------|----------|
| 5:00 AM - 11:59 AM | "Good Morning" |
| 12:00 PM - 5:59 PM | "Good Afternoon" |
| 6:00 PM - 11:59 PM | "Good Evening" |
| 12:00 AM - 4:59 AM | "Good Night" |

---

### 2. Focus Timer Component

**Responsibilities:**
- Countdown timer from 25 minutes
- Start, pause, and reset controls
- Visual state indication (Running, Paused, Stopped)
- Alert when timer completes

**Public API:**

```javascript
// Timer states
const TimerState = {
  STOPPED: 'stopped',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed'
};

// Initialize timer
Timer.init();

// Control functions
Timer.start()    // Begin countdown
Timer.pause()    // Pause countdown
Timer.reset()    // Reset to 25:00

// Getters
Timer.getState()    // Get current state
Timer.getTime()     // Get remaining time in seconds
```

**HTML Structure:**
```html
<div class="timer-container">
  <div id="timer-display">25:00</div>
  <div id="timer-state">Stopped</div>
  <div class="timer-controls">
    <button id="start-btn">Start</button>
    <button id="pause-btn">Pause</button>
    <button id="reset-btn">Reset</button>
  </div>
</div>
```

**Timer Behavior:**
- Default time: 25 minutes (1500 seconds)
- Update interval: 1000ms (1 second)
- Completion: Display "Time's up!" when countdown reaches 0
- State tracking: Running, Paused, Stopped, Completed

---

### 3. To-Do List Component

**Responsibilities:**
- Add new tasks
- Edit existing tasks (inline)
- Mark tasks as complete
- Delete tasks
- Persist to Local Storage

**Task Data Model:**
```javascript
interface Task {
  id: string;           // Unique identifier (timestamp-based)
  text: string;         // Task description
  completed: boolean;   // Completion status
  createdAt: number;    // Creation timestamp
}
```

**Public API:**

```javascript
// Initialize todo list
TodoList.init();

// Operations
TodoList.addTask(text)           // Add new task
TodoList.editTask(id, text)      // Edit task text
TodoList.toggleTask(id)          // Toggle completion
TodoList.deleteTask(id)          // Remove task
TodoList.getTasks()              // Get all tasks

// Storage
TodoList.save()                  // Save to Local Storage
TodoList.load()                  // Load from Local Storage
```

**HTML Structure:**
```html
<div class="todo-container">
  <h2>To-Do List</h2>
  <div class="todo-input-group">
    <input type="text" id="todo-input" placeholder="Add a new task...">
    <button id="add-task-btn">Add</button>
  </div>
  <ul id="todo-list"></ul>
</div>
```

**Task Item HTML:**
```html
<li class="todo-item" data-id="{id}">
  <input type="checkbox" class="todo-checkbox">
  <span class="todo-text">{text}</span>
  <button class="delete-btn">×</button>
</li>
```

**Interaction States:**
- Default: Normal text
- Completed: Strikethrough, dimmed opacity (0.6)
- Hovering: Background highlight
- Editing: Input field replaces text

---

### 4. Quick Links Component

**Responsibilities:**
- Add new links with name and URL
- Display links as clickable buttons
- Open links in new tab
- Delete existing links
- Persist to Local Storage

**Link Data Model:**
```javascript
interface QuickLink {
  id: string;           // Unique identifier (timestamp-based)
  name: string;         // Display name
  url: string;          // Website URL (must include protocol)
}
```

**Public API:**

```javascript
// Initialize quick links
QuickLinks.init();

// Operations
QuickLinks.addLink(name, url)    // Add new link
QuickLinks.deleteLink(id)        // Remove link
QuickLinks.getLinks()            // Get all links

// Storage
QuickLinks.save()                // Save to Local Storage
QuickLinks.load()                // Load from Local Storage
```

**HTML Structure:**
```html
<div class="links-container">
  <h2>Quick Links</h2>
  <div class="links-input-group">
    <input type="text" id="link-name" placeholder="Site name...">
    <input type="url" id="link-url" placeholder="https://...">
    <button id="add-link-btn">Add</button>
  </div>
  <div id="links-list" class="links-grid"></div>
</div>
```

**Link Button HTML:**
```html
<a href="{url}" target="_blank" class="link-btn" data-id="{id}">
  {name}
  <span class="delete-link">×</span>
</a>
```

---

## Data Models

### Local Storage Keys

| Key | Data Type | Description |
|-----|-----------|-------------|
| `todo_tasks` | Array<Task> | All to-do tasks |
| `todo_links` | Array<QuickLink> | All quick links |

### Task Schema

```javascript
{
  "id": "1706789000000",           // Unix timestamp as string
  "text": "Complete project",      // Non-empty string
  "completed": false,              // Boolean
  "createdAt": 1706789000000       // Unix timestamp
}
```

### QuickLink Schema

```javascript
{
  "id": "1706789000000",           // Unix timestamp as string
  "name": "Google",                // Display name
  "url": "https://google.com"      // Valid URL with protocol
}
```

### Validation Rules

**Task Text:**
- Must be non-empty after trimming
- Maximum length: 500 characters

**Link Name:**
- Must be non-empty after trimming
- Maximum length: 50 characters

**Link URL:**
- Must be valid URL format
- Must start with http:// or https://
- Maximum length: 2048 characters

---

## Error Handling

### Local Storage Errors

1. **Storage Full**: Display user-friendly message, suggest clearing old data
2. **Storage Disabled**: Detect via try-catch, show warning banner
3. **Corrupted Data**: Reset to empty array, log error for debugging

```javascript
function safeStorageOperation(operation, fallback) {
  try {
    return operation();
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.error('Local Storage is full');
      showNotification('Storage is full. Please delete some tasks or links.');
    } else if (error.name === 'SecurityError') {
      console.error('Local Storage is disabled');
      showNotification('Local Storage is disabled. Data will not be saved.');
    } else {
      console.error('Storage error:', error);
    }
    return fallback;
  }
}
```

### Input Validation

1. **Empty Input**: Prevent submission, show validation message
2. **Invalid URL**: Validate before adding, show format requirements
3. **Maximum Length**: Truncate or prevent input beyond limits

### Timer Edge Cases

1. **Tab Inactive**: Use Web Workers or track elapsed time on visibility change to maintain accuracy
2. **Rapid Clicking**: Debounce control buttons to prevent race conditions
3. **Browser Refresh**: Timer state is not persisted (by design - starts fresh on each load)

---

## Testing Strategy

### Why Property-Based Testing Is Not Applicable

This feature involves:
- **UI rendering** - Visual output cannot be meaningfully tested with PBT
- **Simple CRUD operations** - No complex transformation logic
- **Browser APIs** - Local Storage and DOM manipulation are side effects

PBT would not add value here because:
- Input spaces are small (fixed form inputs, limited options)
- Behavior doesn't vary meaningfully with random inputs
- The main logic is state management, not algorithms

### Testing Approach: Example-Based

**Unit Tests:**
- Test each component's core functions in isolation
- Test Local Storage read/write operations
- Test validation logic

**Integration Tests:**
- Test complete user workflows (add task → verify display → verify storage)
- Test component interactions (timer completion triggers notification)

### Test Cases by Component

#### Clock Component
| Test Case | Expected Result |
|-----------|-----------------|
| Initialize at 9:00 AM | Display "09:00:00", "Good Morning" |
| Initialize at 2:00 PM | Display "14:00:00", "Good Afternoon" |
| Initialize at 8:00 PM | Display "20:00:00", "Good Evening" |
| Initialize at 1:00 AM | Display "01:00:00", "Good Night" |

#### Timer Component
| Test Case | Expected Result |
|-----------|-----------------|
| Initial state | Display "25:00", state = "Stopped" |
| Start timer | Countdown begins, state = "Running" |
| Pause timer | Countdown stops, state = "Paused" |
| Reset timer | Display "25:00", state = "Stopped" |
| Timer completes | Display "Time's up!", state = "Completed" |

#### To-Do List Component
| Test Case | Expected Result |
|-----------|-----------------|
| Add valid task | Task appears in list, Local Storage updated |
| Add empty task | Task not added, validation error shown |
| Toggle task | Checkbox toggled, strikethrough applied/removed |
| Edit task | Text becomes editable, changes saved on blur |
| Delete task | Task removed from list and storage |
| Page reload | All tasks restored from Local Storage |

#### Quick Links Component
| Test Case | Expected Result |
|-----------|-----------------|
| Add valid link | Link button appears, opens in new tab |
| Add invalid URL | Link not added, validation error shown |
| Delete link | Link removed from display and storage |
| Page reload | All links restored from Local Storage |

### Manual Testing Checklist

- [ ] Clock updates every second without flickering
- [ ] Greeting changes correctly at boundary times
- [ ] Timer counts down accurately
- [ ] Timer controls respond immediately
- [ ] Tasks can be added, edited, completed, deleted
- [ ] Task data persists after page refresh
- [ ] Quick links open in new tabs
- [ ] Quick link data persists after page refresh
- [ ] UI is readable and well-organized
- [ ] Hover and active states provide feedback
- [ ] Works in Chrome, Firefox, Edge, Safari

---

## File Structure

### css/style.css

```css
/* Main Layout */
body {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #f5f5f5;
}

/* Component Containers */
.clock-container, .timer-container, 
.todo-container, .links-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Clock Styles */
#greeting { font-size: 2rem; margin: 0; }
#time { font-size: 3rem; font-weight: bold; }
#date { color: #666; }

/* Timer Styles */
#timer-display { font-size: 4rem; text-align: center; }
#timer-state { text-align: center; color: #666; margin-bottom: 10px; }
.timer-controls { display: flex; justify-content: center; gap: 10px; }

/* To-Do Styles */
.todo-item { 
  display: flex; 
  align-items: center; 
  padding: 10px;
  border-bottom: 1px solid #eee;
}
.todo-item.completed .todo-text {
  text-decoration: line-through;
  opacity: 0.6;
}

/* Quick Links Styles */
.links-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.link-btn {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 4px;
}
```

### js/app.js

```javascript
// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
  Clock.init();
  Timer.init();
  TodoList.init();
  QuickLinks.init();
});

// Clock Component
const Clock = {
  init() { /* ... */ },
  // ...
};

// Timer Component  
const Timer = {
  init() { /* ... */ },
  // ...
};

// TodoList Component
const TodoList = {
  init() { /* ... */ },
  // ...
};

// QuickLinks Component
const QuickLinks = {
  init() { /* ... */ },
  // ...
};
```

---

## Acceptance Criteria Mapping

| Requirement | Component | Test Strategy |
|-------------|-----------|---------------|
| 1.1 Time display HH:MM:SS | Clock | Unit test |
| 1.2 Date display | Clock | Unit test |
| 1.3 Time-based greeting | Clock | Example-based |
| 2.1 Timer countdown | Timer | Unit test |
| 2.2 Start button | Timer | Integration test |
| 2.3 Pause button | Timer | Integration test |
| 2.4 Reset button | Timer | Integration test |
| 2.5 Timer completion | Timer | Integration test |
| 2.6 Timer state display | Timer | Example-based |
| 3.1 Add task | TodoList | Integration test |
| 3.2 Display task | TodoList | Visual check |
| 3.3 Edit task | TodoList | Integration test |
| 3.4 Complete task | TodoList | Integration test |
| 3.5 Delete task | TodoList | Integration test |
| 3.6 Save to storage | TodoList | Unit test |
| 3.7 Load from storage | TodoList | Integration test |
| 4.1 Add link | QuickLinks | Integration test |
| 4.2 Open in new tab | QuickLinks | Integration test |
| 4.3 Save to storage | QuickLinks | Unit test |
| 4.4 Load from storage | QuickLinks | Integration test |
| 4.5 Delete link | QuickLinks | Integration test |

---

## Implementation Notes

1. **Timer Accuracy**: Use `Date.now()` delta calculation rather than relying solely on `setInterval` to account for tab inactivity
2. **Event Delegation**: Use event delegation for dynamically created elements (tasks, links)
3. **Input Sanitization**: Sanitize user inputs before rendering to prevent XSS
4. **Accessibility**: Include ARIA labels, keyboard navigation support, and focus management
5. **Responsive Design**: Ensure layout works on mobile devices (min-width: 320px)