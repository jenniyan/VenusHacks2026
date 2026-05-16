import { formatSummaryLine } from "./lumin.js";

export function buildDetectionMessage(analysis, mode) {
  const requested = analysis.requestedPerson
    ? analysis.requestedPerson.name
    : "No specific teammate";
  const suggested = analysis.suggestedPerson?.name || "No suggestion available";
  const loadLine = formatSummaryLine(analysis.summary);

  return {
    text: `Lumin detected a ${analysis.category} request. Suggested: ${suggested}.`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Lumin detected invisible labor"
        }
      },
      {
        type: "section",
        fields: [
          mrkdwnField("*Category*", titleCase(analysis.category)),
          mrkdwnField("*Confidence*", `${titleCase(analysis.confidenceLabel)} (${Math.round(analysis.confidence * 100)}%)`),
          mrkdwnField("*Requested*", requested),
          mrkdwnField("*Suggested*", suggested)
        ]
      },
      {
        type: "section",
        text: mrkdwn(
          `*Why it was flagged*\n${analysis.explanation}\n\n*Fairness signal*\n${analysis.warning}`
        )
      },
      {
        type: "context",
        elements: [
          mrkdwn(`Current ${mode} load: ${loadLine}`)
        ]
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: plainText(`Assign to ${analysis.suggestedPerson.name.split(" ")[0]}`),
            style: "primary",
            action_id: "assign_suggested",
            value: encodeActionValue({
              memberId: analysis.suggestedPerson.id,
              category: analysis.category,
              taskTitle: analysis.taskTitle,
              requestedPersonId: analysis.requestedPerson?.isUnmappedSlackUser
                ? null
                : analysis.requestedPerson?.id || null,
              sourceMessage: analysis.sourceMessage
            })
          },
          {
            type: "button",
            text: plainText("Show team load"),
            action_id: "show_team_load",
            value: encodeActionValue({ category: analysis.category })
          },
          {
            type: "button",
            text: plainText("Dismiss"),
            action_id: "dismiss_suggestion",
            value: encodeActionValue({ category: analysis.category })
          }
        ]
      }
    ]
  };
}

export function buildNoDetectionMessage(text) {
  return {
    text: "Lumin did not detect invisible labor in that message.",
    blocks: [
      {
        type: "section",
        text: mrkdwn(`I did not detect an invisible-labor request in:\n>${text || "(empty message)"}`)
      }
    ]
  };
}

export function buildSummaryMessage({ team, summary, mode }) {
  const lines = summary.ranked.map((person) => {
    const categories = summary.byPersonCategory[person.id] || {};
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    const categoryText = topCategory ? ` - most: ${topCategory[0]} (${topCategory[1]})` : "";
    return `*${person.name}*: ${person.totalTasks}${categoryText}`;
  });

  return {
    text: `Current Lumin ${mode} load: ${formatSummaryLine(summary)}`,
    blocks: [
      {
        type: "header",
        text: plainText("Lumin team load")
      },
      {
        type: "section",
        text: mrkdwn(lines.join("\n"))
      },
      {
        type: "context",
        elements: [
          mrkdwn(`${team.length} members - ${summary.totalTasks} tracked tasks - ${mode} mode`)
        ]
      }
    ]
  };
}

export function buildRosterMessage(team, mode) {
  return {
    text: `Lumin roster: ${team.map((person) => person.name).join(", ")}`,
    blocks: [
      {
        type: "header",
        text: plainText("Lumin roster")
      },
      {
        type: "section",
        text: mrkdwn(
          team.map((person) => {
            const slackStatus = person.slackUserId ? ` - Slack: <@${person.slackUserId}>` : "";
            return `*${person.name}* - ${person.role}${slackStatus}`;
          }).join("\n")
        )
      },
      {
        type: "context",
        elements: [
          mrkdwn(`Using ${mode} data. Add LUMIN_SLACK_USER_MAP to map real Slack mentions to mock teammates.`)
        ]
      }
    ]
  };
}

export function buildAssignmentMessage(result) {
  return {
    text: `Assigned ${result.task.title} to ${result.member.name}.`,
    blocks: [
      {
        type: "section",
        text: mrkdwn(
          `Assigned *${result.task.title}* to *${result.member.name}*.\n` +
          `Updated load: ${formatSummaryLine(result.summary)}`
        )
      }
    ]
  };
}

export function buildResetMessage(result, mode) {
  return {
    text: "Lumin demo data reset.",
    blocks: [
      {
        type: "section",
        text: mrkdwn(`Demo data reset in ${mode} mode.\nCurrent load: ${formatSummaryLine(result.summary)}`)
      }
    ]
  };
}

export function removeActionBlocks(blocks, note) {
  const nextBlocks = blocks.filter((block) => block.type !== "actions");
  nextBlocks.push({
    type: "context",
    elements: [mrkdwn(note)]
  });
  return nextBlocks;
}

function encodeActionValue(value) {
  return JSON.stringify({
    ...value,
    sourceMessage: value.sourceMessage?.slice(0, 500)
  });
}

function mrkdwn(text) {
  return {
    type: "mrkdwn",
    text
  };
}

function mrkdwnField(label, value) {
  return {
    type: "mrkdwn",
    text: `${label}\n${value}`
  };
}

function plainText(text) {
  return {
    type: "plain_text",
    text,
    emoji: true
  };
}

function titleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
