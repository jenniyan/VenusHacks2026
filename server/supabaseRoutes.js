import express from "express";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const router = express.Router();

const supabase = createClient(
  normalizeSupabaseUrl(process.env.SUPABASE_URL),
  process.env.SUPABASE_ANON_KEY
);

function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl) {
    throw new Error("SUPABASE_URL is missing from .env");
  }

  const url = new URL(rawUrl);
  url.search = "";
  url.hash = "";

  if (url.pathname.startsWith("/rest/v1")) {
    url.pathname = "/";
  }

  return url.toString().replace(/\/$/, "");
}

// GET total number of tasks
router.get("/tasks/count", async (req, res) => {
  try {
    const { count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all team members
router.get("/team-members", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("team_members")
      .select("*");

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all tasks
router.get("/tasks", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*");

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET team member with most tasks assigned
router.get("/team-members/stats/most-tasks", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("assigned_to")
      .order("assigned_to");

    if (error) throw error;

    // Count tasks per team member
    const taskCounts = {};
    data.forEach((task) => {
      taskCounts[task.assigned_to] =
        (taskCounts[task.assigned_to] || 0) + 1;
    });

    // Find team member with most tasks
    const mostTasks = Object.entries(taskCounts).reduce((a, b) =>
      a[1] > b[1] ? a : b
    );

    // Get team member details
    const { data: teamMember, error: memberError } = await supabase
      .from("team_members")
      .select("*")
      .eq("slack_user_id", mostTasks[0])
      .single();

    if (memberError) throw memberError;

    res.json({
      ...teamMember,
      task_count: mostTasks[1],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET team member with least tasks assigned
router.get("/team-members/stats/least-tasks", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("assigned_to");

    if (error) throw error;

    // Count tasks per team member
    const taskCounts = {};
    data.forEach((task) => {
      taskCounts[task.assigned_to] =
        (taskCounts[task.assigned_to] || 0) + 1;
    });

    // Find team member with least tasks
    const leastTasks = Object.entries(taskCounts).reduce((a, b) =>
      a[1] < b[1] ? a : b
    );

    // Get team member details
    const { data: teamMember, error: memberError } = await supabase
      .from("team_members")
      .select("*")
      .eq("slack_user_id", leastTasks[0])
      .single();

    if (memberError) throw memberError;

    res.json({
      ...teamMember,
      task_count: leastTasks[1],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET number of tasks in a specific category
router.get("/tasks/by-category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { count, error } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("category", category);

    if (error) throw error;

    res.json({ category, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all tasks with team member details
router.get("/tasks/with-details", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "*, assigned_to_user:team_members!tasks_assigned_to_fkey(display_name, slack_user_id), suggested_to_user:team_members!tasks_suggested_to_fkey(display_name, slack_user_id), message:messages(sender, channel, timestamp, message)"
      );

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== TEAM MEMBERS ROUTES =====

// CREATE team member
router.post("/team-members", async (req, res) => {
  try {
    const { slack_user_id, display_name } = req.body;

    if (!slack_user_id || !display_name) {
      return res.status(400).json({
        error: "slack_user_id and display_name are required",
      });
    }

    const { data, error } = await supabase
      .from("team_members")
      .insert([{ slack_user_id, display_name }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE team member
router.put("/team-members/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { slack_user_id, display_name } = req.body;

    const updates = {};
    if (slack_user_id !== undefined) updates.slack_user_id = slack_user_id;
    if (display_name !== undefined) updates.display_name = display_name;

    const { data, error } = await supabase
      .from("team_members")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ error: "Team member not found" });
    }

    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE team member
router.delete("/team-members/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ message: "Team member deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== MESSAGES ROUTES =====

// CREATE message
router.post("/messages", async (req, res) => {
  try {
    const { sender, channel, message } = req.body;

    if (!sender || !channel) {
      return res.status(400).json({
        error: "sender and channel are required",
      });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert([{ sender, channel, message }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE message
router.put("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sender, channel, message } = req.body;

    const updates = {};
    if (sender !== undefined) updates.sender = sender;
    if (channel !== undefined) updates.channel = channel;
    if (message !== undefined) updates.message = message;

    const { data, error } = await supabase
      .from("messages")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE message
router.delete("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== TASKS ROUTES =====

// CREATE task
router.post("/tasks", async (req, res) => {
  try {
    const {
      message_id,
      title,
      category,
      suggested_to,
      assigned_to,
      created_at,
    } = req.body;

    if (
      !message_id ||
      !title ||
      !category ||
      !suggested_to ||
      !assigned_to ||
      !created_at
    ) {
      return res.status(400).json({
        error: "All fields are required: message_id, title, category, suggested_to, assigned_to, created_at",
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          message_id,
          title,
          category,
          suggested_to,
          assigned_to,
          created_at,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE task
router.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      message_id,
      title,
      category,
      suggested_to,
      assigned_to,
      created_at,
    } = req.body;

    const updates = {};
    if (message_id !== undefined) updates.message_id = message_id;
    if (title !== undefined) updates.title = title;
    if (category !== undefined) updates.category = category;
    if (suggested_to !== undefined) updates.suggested_to = suggested_to;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (created_at !== undefined) updates.created_at = created_at;

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH mark task complete
router.patch("/tasks/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("tasks")
      .update({ completed: true })
      .eq("id", id)
      .select();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: "Task not found" });

    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE task
router.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
