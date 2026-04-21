import { spawnSync } from 'node:child_process';

export interface GitDiffOptions {
  base: string;
  cwd: string;
  includeUntracked?: boolean;
}

/**
 * Returns the list of files changed (repo-relative, POSIX paths) between
 * `base` and the working tree. Includes staged + unstaged by default, and
 * untracked when `includeUntracked` is true.
 */
export function changedFiles(opts: GitDiffOptions): string[] {
  const files = new Set<string>();

  const diff = runGit(opts.cwd, ['diff', '--name-only', opts.base, '--']);
  for (const line of splitLines(diff)) files.add(line);

  if (opts.includeUntracked) {
    const untracked = runGit(opts.cwd, [
      'ls-files',
      '--others',
      '--exclude-standard',
    ]);
    for (const line of splitLines(untracked)) files.add(line);
  }

  return [...files].sort();
}

export function gitRoot(cwd: string): string | null {
  const res = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
  });
  if (res.status !== 0) return null;
  return res.stdout.trim() || null;
}

export function resolveRef(cwd: string, ref: string): string | null {
  const res = spawnSync('git', ['rev-parse', '--verify', ref], {
    cwd,
    encoding: 'utf8',
  });
  if (res.status !== 0) return null;
  return res.stdout.trim() || null;
}

function runGit(cwd: string, args: string[]): string {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${(res.stderr || '').trim() || 'exit ' + res.status}`,
    );
  }
  return res.stdout;
}

function splitLines(s: string): string[] {
  return s.split('\n').map((l) => l.trim()).filter(Boolean);
}
