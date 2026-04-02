import { readdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

type RouteEntry = {
  path: string;
  kind: "component" | "redirect";
  target: string;
};

const root = process.cwd();
const outputPath = path.join(root, "SYSTEM_CONTEXT.md");
const notesPath = path.join(root, "docs/context-notes.md");
const appPath = path.join(root, "client/src/App.tsx");
const storePath = path.join(root, "client/src/lib/store.ts");
const serverRoutesPath = path.join(root, "server/routes.ts");
const vercelUserDataPath = path.join(root, "api/user-data.ts");
const upperLowerPlanPath = path.join(root, "client/src/lib/upperLowerPlan.ts");
const userDataPath = path.join(root, "shared/userData.ts");
const packagePath = path.join(root, "package.json");
const readmePath = path.join(root, "README.md");
const watchTargets = [
  "client/src",
  "server",
  "shared",
  "api",
  "script/update-context.ts",
  "docs/context-notes.md",
  "package.json",
  "README.md",
];

const keyPackages = [
  "react",
  "vite",
  "typescript",
  "zustand",
  "@tanstack/react-query",
  "wouter",
  "@supabase/supabase-js",
  "express",
  "zod",
  "tailwindcss",
  "@radix-ui/react-dialog",
  "framer-motion",
  "@vercel/node",
];

async function readText(filePath: string) {
  return readFile(filePath, "utf8");
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function shiftMarkdownHeadings(source: string, amount: number) {
  return source.replace(/^(#{1,6})(\s+)/gm, (_, hashes: string, spacing: string) => {
    const nextDepth = Math.min(6, hashes.length + amount);
    return `${"#".repeat(nextDepth)}${spacing}`;
  });
}

function extractRoutes(source: string) {
  const routes: RouteEntry[] = [];

  for (const match of source.matchAll(
    /<Route path="([^"]+)" component=\{([A-Za-z0-9_]+)\} \/>/g,
  )) {
    routes.push({
      path: match[1],
      kind: "component",
      target: match[2],
    });
  }

  for (const match of source.matchAll(
    /<Route path="([^"]+)">\{\(\) => <Redirect to="([^"]+)" \/>\}<\/Route>/g,
  )) {
    routes.push({
      path: match[1],
      kind: "redirect",
      target: match[2],
    });
  }

  if (source.includes('<Route>{() => <Redirect to="/" />}</Route>')) {
    routes.push({
      path: "*",
      kind: "redirect",
      target: "/",
    });
  }

  return routes;
}

function extractServerRoutes(source: string) {
  return [...source.matchAll(/app\.(get|post|put|patch|delete)\("([^"]+)"/g)].map(
    (match) => `${match[1].toUpperCase()} ${match[2]}`,
  );
}

function extractVercelMethods(source: string) {
  return unique(
    [...source.matchAll(/req\.method === "([A-Z]+)"/g)].map(
      (match) => `${match[1]} /api/user-data`,
    ),
  );
}

function extractStoreActions(source: string) {
  const match = source.match(/interface AppState\s*{([\s\S]*?)\n}\n/);
  if (!match) return [];
  return [...match[1].matchAll(/^\s+([A-Za-z0-9_]+):\s*\([^)]*\)\s*=>/gm)].map(
    (entry) => entry[1],
  );
}

function extractEnvVars(source: string) {
  return unique(
    [...source.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((match) => match[1]),
  ).sort();
}

function extractPlanSummary(source: string) {
  const planName = source.match(/planName:\s*"([^"]+)"/)?.[1] ?? "Unknown";
  const frequency = source.match(/frequency:\s*(\d+)/)?.[1] ?? "unknown";
  const scheduleBlock = source.match(/schedule:\s*{([\s\S]*?)\n\s*},\n\s*workouts:/)?.[1] ?? "";
  const schedulePairs = [...scheduleBlock.matchAll(/^\s*([a-z]+):\s*"([^"]+)"/gm)].map(
    (match) => [match[1], match[2]] as const,
  );
  const schedule = schedulePairs.map(([day, slot]) => `${day} -> ${slot}`);
  const workoutNames = unique(
    schedulePairs
      .map(([, slot]) => slot)
      .filter((slot) => slot !== "rest")
      .map((slot) => {
        const escapedSlot = slot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const match = source.match(
          new RegExp(`${escapedSlot}:\\s*{[\\s\\S]*?name:\\s*"([^"]+)"`),
        );
        return match?.[1] ?? slot;
      }),
  );
  return { planName, frequency, schedule, workoutNames };
}

function extractTopLevelSchemaTypes(source: string) {
  return [...source.matchAll(/export const ([A-Za-z0-9_]+Schema) = z\.(object|enum)\(/g)].map(
    (match) => `${match[1]} (${match[2]})`,
  );
}

async function listPageFiles() {
  const pageDir = path.join(root, "client/src/pages");
  const files = await readdir(pageDir);
  return files.filter((file) => file.endsWith(".tsx")).sort();
}

function renderSection(title: string, lines: string[]) {
  return [`## ${title}`, "", ...lines, ""].join("\n");
}

async function buildContext() {
  const [packageText, notes, appSource, storeSource, serverRoutesSource, vercelSource, planSource, userDataSource, readme] =
    await Promise.all([
      readText(packagePath),
      readText(notesPath),
      readText(appPath),
      readText(storePath),
      readText(serverRoutesPath),
      readText(vercelUserDataPath),
      readText(upperLowerPlanPath),
      readText(userDataPath),
      readText(readmePath),
    ]);

  const packageJson = JSON.parse(packageText) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const pageFiles = await listPageFiles();
  const routes = extractRoutes(appSource);
  const serverRoutes = extractServerRoutes(serverRoutesSource);
  const vercelMethods = extractVercelMethods(vercelSource);
  const storeActions = extractStoreActions(storeSource);
  const envVars = unique([
    ...extractEnvVars(serverRoutesSource),
    ...extractEnvVars(vercelSource),
    ...extractEnvVars(await readText(path.join(root, "server/supabase.ts"))),
    ...extractEnvVars(await readText(path.join(root, "server/index.ts"))),
  ]).sort();
  const planSummary = extractPlanSummary(planSource);
  const schemaTypes = extractTopLevelSchemaTypes(userDataSource);
  const dependencyVersions = keyPackages
    .map((name) => {
      const version =
        packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];
      return version ? `${name}@${version}` : null;
    })
    .filter((entry): entry is string => Boolean(entry));

  const content = [
    "# System Context",
    "",
    "> Auto-generated by `pnpm context:update`. Do not edit this file directly.",
    `> Generated at: ${new Date().toISOString()}`,
    "",
    renderSection("Purpose", [
      "Single-file project snapshot for future coding iterations.",
      "Read this first, then open the referenced source files only where deeper detail is needed.",
    ]),
    renderSection("Manual Notes", shiftMarkdownHeadings(notes.trim(), 2).split("\n")),
    renderSection("Commands", Object.entries(packageJson.scripts ?? {}).map(
      ([name, command]) => `- \`${name}\`: \`${command}\``,
    )),
    renderSection("Key Stack", dependencyVersions.map((entry) => `- \`${entry}\``)),
    renderSection("Client Routes", routes.map((route) =>
      route.kind === "component"
        ? `- \`${route.path}\` -> component \`${route.target}\``
        : `- \`${route.path}\` -> redirect \`${route.target}\``,
    )),
    renderSection("API Surface", [
      ...serverRoutes.map((entry) => `- Express: \`${entry}\``),
      ...vercelMethods.map((entry) => `- Vercel: \`${entry}\``),
    ]),
    renderSection("Plan Template", [
      `- Plan name: \`${planSummary.planName}\``,
      `- Weekly frequency: \`${planSummary.frequency}\` training days`,
      ...planSummary.schedule.map((entry) => `- Schedule: \`${entry}\``),
      ...planSummary.workoutNames.map((entry) => `- Workout: \`${entry}\``),
    ]),
    renderSection("Store Actions", storeActions.map((entry) => `- \`${entry}\``)),
    renderSection("Shared Schema Types", schemaTypes.map((entry) => `- \`${entry}\``)),
    renderSection("Key Files", [
      "- `client/src/App.tsx`: top-level routes and providers",
      "- `client/src/lib/store.ts`: persisted app state and action surface",
      "- `client/src/hooks/use-user-data-sync.ts`: local/cloud sync contract",
      "- `client/src/lib/upperLowerPlan.ts`: default weekly plan template",
      "- `client/src/lib/workout.ts`: Today/weekly scheduling helpers",
      "- `shared/userData.ts`: persisted data schema",
      "- `server/routes.ts`: Express API routes",
      "- `api/user-data.ts`: Vercel serverless API parity for user data",
      "- `server/supabase.ts`: Supabase admin client and required env vars",
    ]),
    renderSection("Pages", pageFiles.map((entry) => `- \`client/src/pages/${entry}\``)),
    renderSection("Environment", envVars.map((entry) => `- \`${entry}\``)),
    renderSection("README Snapshot", shiftMarkdownHeadings(readme.trim(), 2).split("\n")),
    renderSection("Refresh Rule", [
      "- Update `docs/context-notes.md` when product intent or architectural caveats change.",
      "- Run `pnpm context:update` after modifying routes, store contracts, schemas, API handlers, build scripts, or dependencies.",
      "- Prefer reading this file before scanning the full tree in future iterations.",
    ]),
    renderSection("Generation Inputs", [
      "- `docs/context-notes.md`",
      "- `package.json`",
      "- `README.md`",
      "- `client/src/App.tsx`",
      "- `client/src/lib/store.ts`",
      "- `client/src/lib/upperLowerPlan.ts`",
      "- `shared/userData.ts`",
      "- `server/routes.ts`",
      "- `api/user-data.ts`",
      "- `server/supabase.ts`",
      "- `server/index.ts`",
    ]),
  ].join("\n");

  await writeFile(outputPath, `${content.trim()}\n`);
  console.log(`Updated ${path.relative(root, outputPath)}`);
}

async function collectTargetEntries(target: string): Promise<string[]> {
  const absolute = path.join(root, target);
  try {
    const stats = await stat(absolute);
    if (!stats.isDirectory()) {
      return [`${target}:${stats.mtimeMs}`];
    }
  } catch {
    return [`missing:${target}`];
  }

  const entries = await readdir(absolute, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((entry) => !["node_modules", ".git", "dist", "build"].includes(entry.name))
      .map(async (entry) => {
        const relativePath = path.join(target, entry.name);
        if (entry.isDirectory()) {
          return collectTargetEntries(relativePath);
        }

        const fileStats = await stat(path.join(root, relativePath));
        return [`${relativePath}:${fileStats.mtimeMs}`];
      }),
  );

  return nested.flat();
}

async function getWatchSignature() {
  const entries = await Promise.all(watchTargets.map((target) => collectTargetEntries(target)));
  return entries.flat().sort().join("|");
}

async function main() {
  const watchMode = process.argv.includes("--watch");
  await buildContext();

  if (!watchMode) return;

  let disposed = false;
  let polling = false;
  let lastSignature = await getWatchSignature();

  const interval = setInterval(() => {
    if (polling || disposed) return;
    polling = true;

    getWatchSignature()
      .then(async (nextSignature) => {
        if (nextSignature === lastSignature) return;
        lastSignature = nextSignature;
        await buildContext();
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        polling = false;
      });
  }, 1000);

  console.log("Watching source files for context updates...");

  const shutdown = () => {
    disposed = true;
    clearInterval(interval);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
