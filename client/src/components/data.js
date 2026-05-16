// data.js — mock team + task history for Lumin

const NPT_CATEGORIES = [
  { id: "notes",       label: "Meeting notes",     short: "Notes" },
  { id: "social",      label: "Social planning",   short: "Social" },
  { id: "onboarding",  label: "Onboarding",        short: "Onboard" },
  { id: "scheduling",  label: "Scheduling",        short: "Sched" },
  { id: "mentoring",   label: "Mentoring",         short: "Mentor" },
  { id: "coordination",label: "Team coordination", short: "Coord" },
];

const CATEGORY_COLOR = {
  notes:        "var(--c-cat-1)",
  social:       "var(--c-cat-2)",
  onboarding:   "var(--c-cat-3)",
  scheduling:   "var(--c-cat-4)",
  mentoring:    "var(--c-cat-5)",
  coordination: "var(--c-cat-6)",
};

const TEAM = [
  { id: "sarah",  name: "Sarah Okafor",     role: "Senior Engineer",      tz: "PT",   joined: "2022-03" },
  { id: "maya",   name: "Maya Iyer",        role: "Engineer II",          tz: "PT",   joined: "2023-01" },
  { id: "priya",  name: "Priya Raman",      role: "Staff Engineer",       tz: "ET",   joined: "2021-08" },
  { id: "elena",  name: "Elena Vasquez",    role: "Engineer I",           tz: "CT",   joined: "2024-06" },
  { id: "alex",   name: "Alex Chen",        role: "Senior Engineer",      tz: "PT",   joined: "2022-09" },
  { id: "daniel", name: "Daniel Park",      role: "Engineer II",          tz: "ET",   joined: "2023-04" },
  { id: "chris",  name: "Chris Müller",    role: "Engineering Manager",  tz: "CET",  joined: "2021-02" },
  { id: "jordan", name: "Jordan Bell",      role: "Engineer I",           tz: "PT",   joined: "2024-02" },
];

// 30-day NPT history: each entry is { person, category, title, date, status }
// dates are days ago. Designed to show clear imbalance (Sarah/Maya/Priya skewed).
const TASK_HISTORY = [
  // Sarah — heavy
  { id: "t01", person: "sarah",  category: "notes",        title: "Took notes — Q3 planning",        days: 28, status: "done" },
  { id: "t02", person: "sarah",  category: "notes",        title: "Took notes — design review",      days: 24, status: "done" },
  { id: "t03", person: "sarah",  category: "social",       title: "Organized team dinner",            days: 21, status: "done" },
  { id: "t04", person: "sarah",  category: "onboarding",   title: "Onboarded contractor (J. Liu)",    days: 17, status: "done" },
  { id: "t05", person: "sarah",  category: "notes",        title: "Took notes — staff sync",          days: 14, status: "done" },
  { id: "t06", person: "sarah",  category: "scheduling",   title: "Scheduled offsite logistics",      days: 11, status: "done" },
  { id: "t07", person: "sarah",  category: "social",       title: "Coordinated farewell card",         days:  8, status: "done" },
  { id: "t08", person: "sarah",  category: "mentoring",    title: "Mentored Elena · sprint 14",        days:  5, status: "done" },
  { id: "t09", person: "sarah",  category: "notes",        title: "Took notes — postmortem",           days:  3, status: "done" },
  { id: "t10", person: "sarah",  category: "coordination", title: "Owned holiday OOO tracker",         days:  2, status: "open" },

  // Maya — also heavy
  { id: "t11", person: "maya",   category: "notes",        title: "Took notes — weekly sync",          days: 27, status: "done" },
  { id: "t12", person: "maya",   category: "onboarding",   title: "Onboarded Elena",                   days: 22, status: "done" },
  { id: "t13", person: "maya",   category: "notes",        title: "Took notes — design crit",          days: 19, status: "done" },
  { id: "t14", person: "maya",   category: "mentoring",    title: "Mentored Jordan · sprint 13",       days: 13, status: "done" },
  { id: "t15", person: "maya",   category: "social",       title: "Organized birthday cake",           days:  9, status: "done" },
  { id: "t16", person: "maya",   category: "notes",        title: "Took notes — leadership review",    days:  6, status: "done" },
  { id: "t17", person: "maya",   category: "coordination", title: "Ran sprint retro logistics",        days:  1, status: "open" },

  // Priya
  { id: "t18", person: "priya",  category: "mentoring",    title: "Mentored Daniel · staff promo",     days: 25, status: "done" },
  { id: "t19", person: "priya",  category: "onboarding",   title: "Onboarded Jordan",                  days: 20, status: "done" },
  { id: "t20", person: "priya",  category: "coordination", title: "Ran on-call rotation rebuild",      days: 12, status: "done" },
  { id: "t21", person: "priya",  category: "notes",        title: "Took notes — arch review",          days:  7, status: "done" },
  { id: "t22", person: "priya",  category: "mentoring",    title: "Mentored Elena · architecture",     days:  4, status: "done" },

  // Chris (manager) — some scheduling
  { id: "t23", person: "chris",  category: "scheduling",   title: "Scheduled 1:1 cadence reset",       days: 23, status: "done" },
  { id: "t24", person: "chris",  category: "coordination", title: "Coordinated cross-team launch",     days: 10, status: "done" },
  { id: "t25", person: "chris",  category: "scheduling",   title: "Booked all-hands rooms",            days:  4, status: "done" },

  // Daniel — light
  { id: "t26", person: "daniel", category: "notes",        title: "Took notes — vendor call",          days: 15, status: "done" },
  { id: "t27", person: "daniel", category: "social",       title: "Picked lunch venue",                 days:  6, status: "done" },

  // Jordan — very light
  { id: "t28", person: "jordan", category: "scheduling",   title: "Scheduled intern coffee chat",       days:  9, status: "done" },

  // Elena — newest, very light
  { id: "t29", person: "elena",  category: "onboarding",   title: "Co-onboarded a contractor",         days:  2, status: "open" },

  // Alex — zero. By design.
];

// helpers
function loadByPerson(history) {
  const m = {};
  for (const t of TASK_HISTORY) m[t.person] = (m[t.person] || 0) + 1;
  return m;
}
function loadByCategory(history) {
  const m = {};
  for (const t of TASK_HISTORY) m[t.category] = (m[t.category] || 0) + 1;
  return m;
}
function loadByPersonCategory(history) {
  const m = {};
  for (const t of TASK_HISTORY) {
    m[t.person] = m[t.person] || {};
    m[t.person][t.category] = (m[t.person][t.category] || 0) + 1;
  }
  return m;
}
// Gini coefficient on per-person counts. 0 = perfect equality, 1 = max inequality.
function gini(counts) {
  const xs = [...counts].sort((a, b) => a - b);
  const n = xs.length;
  if (n === 0) return 0;
  const sum = xs.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += (i + 1) * xs[i];
  return (2 * s) / (n * sum) - (n + 1) / n;
}

// preset chat messages for instant demo
const CHAT_PRESETS = [
  { text: "Can Sarah organize the team dinner again?",        author: "chris"  },
  { text: "Who can take notes for the design review?",         author: "alex"   },
  { text: "Need someone to onboard our new intern next week.", author: "chris"  },
  { text: "Maya, can you mentor Elena through the migration?", author: "priya"  },
  { text: "Can Sarah schedule the next sprint planning?",      author: "daniel" },
  { text: "Shipped the auth refactor — PR is up for review.",  author: "alex"   },
  { text: "Heads up: API latency is climbing on us-east.",     author: "priya"  },
];

window.LUMIN = {
  NPT_CATEGORIES, CATEGORY_COLOR, TEAM, TASK_HISTORY, CHAT_PRESETS,
  loadByPerson, loadByCategory, loadByPersonCategory, gini,
};
