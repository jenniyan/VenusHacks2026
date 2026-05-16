const INITIAL_TEAM = [
  {
    id: "sarah",
    name: "Sarah Okafor",
    role: "Senior Engineer",
    aliases: ["sarah", "sarah okafor"]
  },
  {
    id: "alex",
    name: "Alex Chen",
    role: "Senior Engineer",
    aliases: ["alex", "alex chen"]
  },
  {
    id: "daniel",
    name: "Daniel Park",
    role: "Engineer II",
    aliases: ["daniel", "daniel park"]
  },
  {
    id: "maya",
    name: "Maya Iyer",
    role: "Engineer II",
    aliases: ["maya", "maya iyer"]
  },
  {
    id: "chris",
    name: "Chris Muller",
    role: "Engineering Manager",
    aliases: ["chris", "chris muller", "chris mueller"]
  }
];

export function createDataProvider({
  useMockData = process.env.USE_MOCK_DATA !== "false",
  backendUrl = process.env.BACKEND_URL,
  slackUserMap = process.env.LUMIN_SLACK_USER_MAP || "",
  useSlackRoster = process.env.LUMIN_USE_SLACK_ROSTER === "true",
  slackClient = null
} = {}) {
  if (!useMockData) {
    return createBackendProvider(backendUrl);
  }

  return createMockProvider({ slackUserMap, useSlackRoster, slackClient });
}

function createMockProvider({ slackUserMap, useSlackRoster, slackClient }) {
  let team = hydrateSlackIds(clone(INITIAL_TEAM), slackUserMap);
  let tasks = buildSeedTasks(team);
  let slackRosterLoaded = false;

  return {
    mode: useSlackRoster ? "mock-slack-roster" : "mock",
    async getTeamMembers() {
      await ensureSlackRoster();
      return clone(team);
    },
    async getTaskHistory() {
      await ensureSlackRoster();
      return clone(tasks);
    },
    async recordAssignment({ memberId, category, taskTitle, sourceMessage, requestedPersonId }) {
      await ensureSlackRoster();
      const member = team.find((person) => person.id === memberId);
      if (!member) {
        return null;
      }

      const task = {
        id: `mock-${Date.now()}-${tasks.length + 1}`,
        title: taskTitle || `${category} task`,
        category,
        assignedTo: member.id,
        requestedPersonId: requestedPersonId || null,
        sourceMessage: sourceMessage || null,
        status: "assigned",
        createdAt: new Date().toISOString()
      };

      tasks = [...tasks, task];
      return {
        task: clone(task),
        member: clone(member),
        summary: summarizeLoad(team, tasks)
      };
    },
    async resetDemoData() {
      slackRosterLoaded = false;
      team = hydrateSlackIds(clone(INITIAL_TEAM), slackUserMap);
      tasks = buildSeedTasks(team);
      await ensureSlackRoster();
      return {
        team: clone(team),
        tasks: clone(tasks),
        summary: summarizeLoad(team, tasks)
      };
    }
  };

  async function ensureSlackRoster() {
    if (!useSlackRoster || slackRosterLoaded) {
      return;
    }

    if (!slackClient) {
      throw new Error("A Slack client is required when LUMIN_USE_SLACK_ROSTER=true.");
    }

    const slackTeam = await getSlackWorkspaceTeam(slackClient);
    if (slackTeam.length > 0) {
      team = slackTeam;
      tasks = buildSeedTasks(team);
    }

    slackRosterLoaded = true;
  }
}

function createBackendProvider(backendUrl) {
  if (!backendUrl) {
    throw new Error("BACKEND_URL is required when USE_MOCK_DATA=false.");
  }

  const baseUrl = backendUrl.replace(/\/$/, "");

  return {
    mode: "backend",
    async getTeamMembers() {
      return fetchJson(`${baseUrl}/api/lumin/team`);
    },
    async getTaskHistory() {
      return fetchJson(`${baseUrl}/api/lumin/tasks`);
    },
    async recordAssignment(task) {
      return fetchJson(`${baseUrl}/api/lumin/tasks`, {
        method: "POST",
        body: JSON.stringify(task)
      });
    },
    async resetDemoData() {
      return fetchJson(`${baseUrl}/api/lumin/demo-reset`, {
        method: "POST"
      });
    }
  };
}

export function summarizeLoad(team, tasks) {
  const byPerson = Object.fromEntries(team.map((person) => [person.id, 0]));
  const byPersonCategory = Object.fromEntries(team.map((person) => [person.id, {}]));
  const byCategory = {};

  for (const task of tasks) {
    if (!byPerson[task.assignedTo] && byPerson[task.assignedTo] !== 0) {
      byPerson[task.assignedTo] = 0;
      byPersonCategory[task.assignedTo] = {};
    }

    byPerson[task.assignedTo] += 1;
    byPersonCategory[task.assignedTo][task.category] =
      (byPersonCategory[task.assignedTo][task.category] || 0) + 1;
    byCategory[task.category] = (byCategory[task.category] || 0) + 1;
  }

  const ranked = [...team]
    .map((person) => ({
      ...person,
      totalTasks: byPerson[person.id] || 0
    }))
    .sort((a, b) => b.totalTasks - a.totalTasks || a.name.localeCompare(b.name));

  return {
    totalTasks: tasks.length,
    byPerson,
    byPersonCategory,
    byCategory,
    ranked,
    mostAssigned: ranked[0] || null,
    leastAssigned: [...ranked].reverse()[0] || null
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function hydrateSlackIds(team, slackUserMap) {
  const map = parseSlackUserMap(slackUserMap);
  return team.map((person) => ({
    ...person,
    slackUserId: map[person.id] || person.slackUserId || null
  }));
}

function buildSeedTasks(team) {
  if (team.length === 0) {
    return [];
  }

  const overloaded = team[0]?.id;
  const second = team[1]?.id || overloaded;
  const third = team[2]?.id || second;

  return [
    { id: "seed-1", title: "Organized team lunch", category: "social planning", assignedTo: overloaded, status: "completed", createdAt: "2026-05-01T10:00:00.000Z" },
    { id: "seed-2", title: "Planned team dinner", category: "social planning", assignedTo: overloaded, status: "completed", createdAt: "2026-05-04T10:00:00.000Z" },
    { id: "seed-3", title: "Took design review notes", category: "meeting notes", assignedTo: second, status: "completed", createdAt: "2026-05-05T10:00:00.000Z" },
    { id: "seed-4", title: "Took sprint planning notes", category: "meeting notes", assignedTo: second, status: "completed", createdAt: "2026-05-07T10:00:00.000Z" },
    { id: "seed-5", title: "Scheduled planning meeting", category: "scheduling", assignedTo: third, status: "completed", createdAt: "2026-05-08T10:00:00.000Z" },
    { id: "seed-6", title: "Onboarded new intern", category: "onboarding", assignedTo: overloaded, status: "completed", createdAt: "2026-05-10T10:00:00.000Z" },
    { id: "seed-7", title: "Mentored new teammate", category: "mentoring", assignedTo: overloaded, status: "completed", createdAt: "2026-05-12T10:00:00.000Z" }
  ];
}

async function getSlackWorkspaceTeam(slackClient) {
  const users = [];
  let cursor;

  do {
    const response = await slackClient.users.list({
      limit: 200,
      cursor
    });

    users.push(...(response.members || []));
    cursor = response.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return users
    .filter((user) =>
      !user.deleted &&
      !user.is_bot &&
      !user.is_app_user &&
      user.id !== "USLACKBOT"
    )
    .map((user) => {
      const displayName = user.profile?.display_name_normalized || user.profile?.display_name;
      const realName = user.profile?.real_name_normalized || user.real_name || user.name;
      const name = displayName || realName || user.name;
      const id = normalizeId(user.id);

      return {
        id,
        slackUserId: user.id,
        name,
        role: user.profile?.title || "Slack teammate",
        aliases: buildAliases({ name, realName, displayName, slackName: user.name })
      };
    });
}

function buildAliases({ name, realName, displayName, slackName }) {
  const aliases = new Set([name, realName, displayName, slackName].filter(Boolean));

  for (const alias of [...aliases]) {
    const firstName = alias.split(/\s+/)[0];
    if (firstName) {
      aliases.add(firstName);
    }
  }

  return [...aliases].map((alias) => alias.toLowerCase());
}

function normalizeId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function parseSlackUserMap(value) {
  if (!value.trim()) {
    return {};
  }

  return value.split(",").reduce((acc, pair) => {
    const [rawMemberId, rawSlackUserId] = pair.split(":");
    const memberId = rawMemberId?.trim().toLowerCase();
    const slackUserId = rawSlackUserId?.trim();

    if (memberId && slackUserId) {
      acc[memberId] = slackUserId;
    }

    return acc;
  }, {});
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
