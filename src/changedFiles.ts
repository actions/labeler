import * as core from '@actions/core';
import * as github from '@actions/github';
import {Minimatch} from 'minimatch';

export interface ChangedFilesMatchConfig {
  changedFiles?: string[];
}

type ClientType = ReturnType<typeof github.getOctokit>;

export async function getChangedFiles(
  client: ClientType,
  prNumber: number
): Promise<string[]> {
  const listFilesOptions = client.rest.pulls.listFiles.endpoint.merge({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNumber
  });

  const listFilesResponse = await client.paginate(listFilesOptions);
  const changedFiles = listFilesResponse.map((f: any) => f.filename);

  core.debug('found changed files:');
  for (const file of changedFiles) {
    core.debug('  ' + file);
  }

  return changedFiles;
}

export function toChangedFilesMatchConfig(
  config: any
): ChangedFilesMatchConfig {
  if (!config['changed-files'] || !config['changed-files'].length) {
    return {};
  }

  const changedFilesConfig = config['changed-files'];

  return {
    changedFiles: Array.isArray(changedFilesConfig)
      ? changedFilesConfig
      : [changedFilesConfig]
  };
}

function printPattern(matcher: Minimatch): string {
  return (matcher.negate ? '!' : '') + matcher.pattern;
}

function isMatch(changedFile: string, matchers: Minimatch[]): boolean {
  core.debug(`    matching patterns against file ${changedFile}`);
  for (const matcher of matchers) {
    core.debug(`   - ${printPattern(matcher)}`);
    if (!matcher.match(changedFile)) {
      core.debug(`   ${printPattern(matcher)} did not match`);
      return false;
    }
  }

  core.debug(`   all patterns matched`);
  return true;
}

// equivalent to "Array.some()" but expanded for debugging and clarity
export function checkAnyChangedFiles(
  changedFiles: string[],
  globs: string[]
): boolean {
  const matchers = globs.map(g => new Minimatch(g));
  core.debug(`  checking "any" patterns`);
  for (const changedFile of changedFiles) {
    if (isMatch(changedFile, matchers)) {
      core.debug(`  "any" patterns matched against ${changedFile}`);
      return true;
    }
  }

  core.debug(`  "any" patterns did not match any files`);
  return false;
}

// equivalent to "Array.every()" but expanded for debugging and clarity
export function checkAllChangedFiles(
  changedFiles: string[],
  globs: string[]
): boolean {
  const matchers = globs.map(g => new Minimatch(g));
  core.debug(` checking "all" patterns`);
  for (const changedFile of changedFiles) {
    if (!isMatch(changedFile, matchers)) {
      core.debug(`  "all" patterns did not match against ${changedFile}`);
      return false;
    }
  }

  core.debug(`  "all" patterns matched all files`);
  return true;
}
