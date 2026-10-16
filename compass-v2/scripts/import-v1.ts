// Brings your grants over from Nomad Compass v1 into v2.
//
//   node scripts/import-v1.ts --url https://YOUR-TWENTY-ADDRESS --key YOUR_API_KEY \
//        --grants nomad-compass-grants.json --metrics nomad-compass-metrics.json
//
// Add --dry-run first to see what would happen without changing anything.
// See docs/MIGRATING_FROM_V1.md for the full walk-through.

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export type Args = {
  url?: string;
  key?: string;
  grants?: string;
  metrics?: string;
  year?: number;
  dryRun: boolean;
  help: boolean;
};

const USAGE = `Bring grants over from Nomad Compass v1.

Usage:
  node scripts/import-v1.ts --url <address> --key <api key> --grants <file> [--metrics <file>] [--year 2026] [--dry-run]

  --url      The address you open Twenty at, for example https://crm.yourgroup.org
  --key      An API key from Twenty: Settings > MCP & APIs > API > Create key
  --grants   The grants file saved from v1 (Grant Tracking > Export JSON)
  --metrics  The metrics file saved from v1 (Data Management > Export JSON). Optional.
  --year     v1 stored months as "Jan", "Feb" with no year. This is the year to use. Default: this year.
  --dry-run  Check everything and report what would happen, without changing anything.`;

export const parseArgs = (argv: readonly string[]): Args | { error: string } => {
  const args: Args = { dryRun: false, help: false };

  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    const value = (): string | undefined => argv[++index];

    switch (flag) {
      case '--url': args.url = value(); break;
      case '--key': args.key = value(); break;
      case '--grants': args.grants = value(); break;
      case '--metrics': args.metrics = value(); break;
      case '--year': {
        const year = Number(value());

        if (!Number.isInteger(year) || year < 1990 || year > 2100) return { error: '--year must be a four-digit year such as 2026.' };
        args.year = year;
        break;
      }
      case '--dry-run': args.dryRun = true; break;
      case '--help':
      case '-h': args.help = true; break;
      default: return { error: `I do not know the option "${flag}". Run with --help to see the options.` };
    }
  }

  return args;
};

export const buildBody = (grants: unknown, metrics: unknown, args: Pick<Args, 'year' | 'dryRun'>) => {
  // v1's metrics file is the whole dashboard; the monthly results are in "programs".
  const programs = Array.isArray(metrics)
    ? metrics
    : metrics && typeof metrics === 'object' && Array.isArray((metrics as { programs?: unknown }).programs)
      ? (metrics as { programs: unknown[] }).programs
      : [];

  return {
    grants: Array.isArray(grants) ? grants : [],
    programs,
    ...(args.year ? { year: args.year } : {}),
    dryRun: args.dryRun,
  };
};

type Summary = {
  dryRun: boolean;
  funders: { created: number; alreadyExisted: number };
  grants: { created: number; alreadyExisted: number };
  kpis: number;
  subgrantees: number;
  programResults: { created: number; alreadyExisted: number };
  reviewStatus: string[];
  problems: string[];
};

export const describeSummary = (summary: Summary): string => {
  const verb = summary.dryRun ? 'would be' : 'were';
  const lines = [
    summary.dryRun ? 'DRY RUN. Nothing was changed. This is what would happen:' : 'Import finished.',
    `  Funders:         ${summary.funders.created} ${verb} created, ${summary.funders.alreadyExisted} already existed`,
    `  Grants:          ${summary.grants.created} ${verb} created, ${summary.grants.alreadyExisted} already existed (skipped)`,
    `  KPIs:            ${summary.kpis} ${verb} created`,
    `  Subgrantees:     ${summary.subgrantees} ${verb} created`,
    `  Program results: ${summary.programResults.created} ${verb} created, ${summary.programResults.alreadyExisted} already existed`,
  ];

  if (summary.reviewStatus.length > 0) {
    lines.push('', 'Please check the status of these grants. In v1 they were "Pending", which can mean an application or an award that has not started:');
    lines.push(...summary.reviewStatus.map((name) => `  - ${name}`));
  }
  if (summary.problems.length > 0) {
    lines.push('', 'Things to look at:', ...summary.problems.map((problem) => `  - ${problem}`));
  }

  return lines.join('\n');
};

export type Io = {
  readFile: (path: string) => Promise<string>;
  fetch: typeof fetch;
  log: (message: string) => void;
  error: (message: string) => void;
};

const readJson = async (io: Io, path: string, label: string): Promise<unknown> => {
  let content: string;

  try {
    content = await io.readFile(path);
  } catch {
    throw new Error(`I could not open the ${label} file "${path}". Check the name and that you are in the right folder.`);
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`The ${label} file "${path}" is not a valid JSON file. Use the file saved by v1's Export JSON button.`);
  }
};

// Returns the exit code: 0 for success, 1 for anything that needs attention.
export const run = async (argv: readonly string[], io: Io): Promise<number> => {
  const parsed = parseArgs(argv);

  if ('error' in parsed) {
    io.error(parsed.error);

    return 1;
  }
  if (parsed.help) {
    io.log(USAGE);

    return 0;
  }

  const missing = [!parsed.url && '--url', !parsed.key && '--key', !parsed.grants && '--grants'].filter(Boolean);
  if (missing.length > 0) {
    io.error(`Missing ${missing.join(', ')}.\n\n${USAGE}`);

    return 1;
  }

  try {
    const grants = await readJson(io, parsed.grants as string, 'grants');
    const metrics = parsed.metrics ? await readJson(io, parsed.metrics, 'metrics') : undefined;
    const endpoint = `${(parsed.url as string).replace(/\/+$/, '')}/s/compass/import-v1`;

    const response = await io.fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${parsed.key}` },
      body: JSON.stringify(buildBody(grants, metrics, parsed)),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      const hint =
        response.status === 401 || response.status === 403
          ? 'The API key was not accepted. Create a new key in Twenty (Settings > MCP & APIs > API) and check it was copied completely.'
          : response.status === 404
            ? 'That address does not have Nomad Compass installed, or the address is wrong.'
            : 'Twenty reported a problem.';

      io.error(`The import did not run (error ${response.status}). ${hint}${detail ? `\n\nTwenty said: ${detail}` : ''}`);

      return 1;
    }

    io.log(describeSummary((await response.json()) as Summary));

    return 0;
  } catch (error) {
    io.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.');

    return 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2), {
    readFile: (path) => readFile(path, 'utf8'),
    fetch,
    log: console.log,
    error: console.error,
  }).then((code) => {
    process.exitCode = code;
  });
}
