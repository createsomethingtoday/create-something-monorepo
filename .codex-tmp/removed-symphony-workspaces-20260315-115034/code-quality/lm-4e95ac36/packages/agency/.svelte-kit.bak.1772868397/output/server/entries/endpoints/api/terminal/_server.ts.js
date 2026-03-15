import { json } from "@sveltejs/kit";
import { g as generateCorrelationId, a as logError } from "../../../../chunks/errors.js";
const CARD_PATTERNS = [
  ["░░░░░░░░░░░░░░░░░░░", "░░░ PLACEHOLDER ░░░", "░░░░░░░░░░░░░░░░░░░"],
  ["▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓", "▓▓▓ PLACEHOLDER ▓▓▓", "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓"],
  ["███████████████████", "███ PLACEHOLDER ███", "███████████████████"],
  ["▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒", "▒▒▒ PLACEHOLDER ▒▒▒", "▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒"]
];
function createTerminalCard(paper, index, offset = "") {
  const num = index + 1;
  const title = paper.title.substring(0, 19).padEnd(19, " ");
  const category = (paper.category || "Unknown").substring(0, 14);
  const time = (paper.reading_time || "?") + "min";
  const categoryTime = `${category} • ${time}`.substring(0, 19).padEnd(19, " ");
  const difficultyStr = paper.difficulty_level?.toString() || "N/A";
  const difficulty = `Difficulty: ${difficultyStr.substring(0, 8)}`.substring(0, 19).padEnd(19, " ");
  const pattern = CARD_PATTERNS[index % CARD_PATTERNS.length];
  return [
    `${offset}┌───────────────────────┐`,
    `${offset}│  ${pattern[0]}  │`,
    `${offset}│  ${pattern[1]}  │`,
    `${offset}│  ${pattern[2]}  │`,
    `${offset}├───────────────────────┤`,
    `${offset}│ ${num}. ${title} │`,
    `${offset}│ ${categoryTime} │`,
    `${offset}│ ${difficulty} │`,
    `${offset}└───────────────────────┘`
  ];
}
function createTerminalHeader(title, width = 65) {
  const innerWidth = width - 2;
  const paddedTitle = title.substring(0, innerWidth).padStart((innerWidth + title.length) / 2).padEnd(innerWidth);
  return [
    "╔" + "═".repeat(innerWidth) + "╗",
    "║" + paddedTitle + "║",
    "╚" + "═".repeat(innerWidth) + "╝"
  ];
}
function createTerminalCardGrid(papers, rotationOffset = true) {
  const outputLines = [];
  for (let i = 0; i < papers.length; i += 2) {
    const leftPaper = papers[i];
    const rightPaper = papers[i + 1];
    const isOffsetRow = Math.floor(i / 2) % 2 === 1;
    const rowOffset = rotationOffset && isOffsetRow ? "    " : "";
    const leftCard = createTerminalCard(leftPaper, i, rowOffset);
    if (rightPaper) {
      const rightCard = createTerminalCard(rightPaper, i + 1, rowOffset);
      for (let j = 0; j < leftCard.length; j++) {
        outputLines.push(leftCard[j] + "  " + rightCard[j].trim());
      }
    } else {
      outputLines.push(...leftCard);
    }
    outputLines.push("");
  }
  return outputLines;
}
const POST = async ({ request, platform }) => {
  try {
    const body = await request.json();
    const { command, args, path } = body;
    const DB = platform?.env?.DB;
    if (!DB) {
      return json({
        output: "Database not available. Running in development mode.",
        type: "error"
      });
    }
    switch (command) {
      case "papers": {
        const papers = await DB.prepare(`
					SELECT id, title, category, reading_time, difficulty_level
					FROM papers
					WHERE published = 1
					ORDER BY created_at DESC
					LIMIT 10
				`).all();
        if (!papers.results.length) {
          return json({
            output: "No papers found.",
            type: "info"
          });
        }
        const paperList = papers.results;
        const header = createTerminalHeader("TECHNICAL PAPERS LIBRARY");
        const cards = createTerminalCardGrid(paperList, true);
        const outputLines = [
          "",
          ...header,
          "",
          ...cards,
          "",
          'Type "read <number>" to read a paper',
          ""
        ];
        return json({
          output: outputLines.join("\n"),
          type: "success"
        });
      }
      case "read": {
        if (!args) {
          return json({
            output: "Usage: read <paper-number>",
            type: "error"
          });
        }
        const paperNum = parseInt(args);
        if (isNaN(paperNum) || paperNum < 1) {
          return json({
            output: "Please provide a valid paper number",
            type: "error"
          });
        }
        const paper = await DB.prepare(`
					SELECT id, title, category, reading_time, difficulty_level, excerpt_short, excerpt_long
					FROM papers
					WHERE published = 1
					ORDER BY created_at DESC
					LIMIT 1 OFFSET ?
				`).bind(paperNum - 1).first();
        if (!paper) {
          return json({
            output: `Paper #${paperNum} not found`,
            type: "error"
          });
        }
        const output = [
          "",
          "╔════════════════════════════════════════════════════════════════════╗",
          `║ ${paper.title.padEnd(66, " ").substring(0, 66)} ║`,
          "╚════════════════════════════════════════════════════════════════════╝",
          "",
          `Category: ${paper.category}`,
          `Reading Time: ${paper.reading_time || "?"} minutes`,
          `Difficulty: ${paper.difficulty_level || "N/A"}`,
          "",
          "────────────────────────────────────────────────────────────────────",
          "",
          paper.excerpt_long || paper.excerpt_short || "No description available.",
          "",
          'Type "papers" to return to the list',
          ""
        ].join("\n");
        return json({
          output,
          type: "success"
        });
      }
      case "search": {
        if (!args) {
          return json({
            output: "Usage: search <query>",
            type: "error"
          });
        }
        const results = await DB.prepare(`
					SELECT id, title, category, excerpt_short
					FROM papers
					WHERE published = 1
					AND (title LIKE ? OR content LIKE ? OR category LIKE ?)
					LIMIT 5
				`).bind(`%${args}%`, `%${args}%`, `%${args}%`).all();
        if (!results.results.length) {
          return json({
            output: `No papers found matching: "${args}"`,
            type: "info"
          });
        }
        const searchResults = results.results;
        const output = [
          "",
          `Search results for "${args}":`,
          "",
          ...searchResults.map(
            (p, i) => `[${i + 1}] ${p.title} (${p.category})`
          ),
          ""
        ].join("\n");
        return json({
          output,
          type: "success"
        });
      }
      case "ls": {
        if (path === "/" || !path) {
          return json({
            output: `/
├── papers/
│   ├── automation/
│   ├── webflow/
│   ├── development/
│   └── [5 papers]
├── about/
├── contact/
└── help/`,
            type: "success"
          });
        }
        if (path.includes("papers")) {
          const paperCount = await DB.prepare(
            "SELECT COUNT(*) as count FROM papers WHERE published = 1"
          ).first();
          return json({
            output: `papers/
└── [${paperCount?.count || 0} technical papers]`,
            type: "success"
          });
        }
        return json({
          output: `Directory not found: ${path}`,
          type: "error"
        });
      }
      case "cd": {
        if (!args || args === "~" || args === "/") {
          return json({
            output: "",
            type: "success",
            newPath: "/"
          });
        }
        if (args === "..") {
          const parentPath = path.split("/").slice(0, -1).join("/") || "/";
          return json({
            output: "",
            type: "success",
            newPath: parentPath
          });
        }
        const newPath = args.startsWith("/") ? args : path === "/" ? `/${args}` : `${path}/${args}`;
        return json({
          output: "",
          type: "success",
          newPath
        });
      }
      default:
        return json({
          output: `Command not found: ${command}. Type "help" for available commands.`,
          type: "error"
        });
    }
  } catch (err) {
    const correlationId = generateCorrelationId();
    logError("Terminal command", err, correlationId);
    return json({
      output: `Error processing command. (Ref: ${correlationId})`,
      type: "error",
      correlationId
    }, { status: 500 });
  }
};
export {
  POST
};
