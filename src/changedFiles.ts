import * as core from '@actions/core';
import * as github from '@actions/github';
import {Minimatch} from 'minimatch';
import {PrFileType} from './labeler';

export interface ChangedFilesMatchConfig {
  changedFiles?: string[];
}

type ClientType = ReturnType<typeof github.getOctokit>;

export async function getChangedFiles(
  client: ClientType,
  prNumber: number
): Promise<PrFileType[]> {
  const listFilesOptions = client.rest.pulls.listFiles.endpoint.merge({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNumber
  });

  const listFilesResponse = await client.paginate(listFilesOptions);
  const changedFiles = listFilesResponse.map((f: any) => {
    return {
      name: f.filename as string,
      size: (f.additions + f.deletions + f.changes) as number
    };
  });

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

function isAnyMatch(changedFile: PrFileType, matchers: Minimatch[]): boolean {
  core.debug(`    matching patterns against file ${changedFile}`);
  for (const matcher of matchers) {
    core.debug(`     - ${printPattern(matcher)}`);
    if (matcher.match(changedFile.name)) {
      core.debug(`    ${printPattern(matcher)} matched`);
      return true;
    }
  }

  core.debug(`    no patterns matched`);
  return false;
}

function isAllMatch(changedFile: PrFileType, matchers: Minimatch[]): boolean {
  core.debug(`    matching patterns against file ${changedFile}`);
  for (const matcher of matchers) {
    core.debug(`     - ${printPattern(matcher)}`);
    if (!matcher.match(changedFile.name)) {
      core.debug(`    ${printPattern(matcher)} did not match`);
      return false;
    }
  }

  core.debug(`    all patterns matched`);
  return true;
}

export function checkAnyChangedFiles(
  changedFiles: PrFileType[],
  globs: string[]
): boolean {
  const matchers = globs.map(g => new Minimatch(g));
  for (const changedFile of changedFiles) {
    if (isAnyMatch(changedFile, matchers)) {
      core.debug(`   "any" patterns matched against ${changedFile}`);
      return true;
    }
  }

  core.debug(`   "any" patterns did not match any files`);
  return false;
}

export function checkAllChangedFiles(
  changedFiles: PrFileType[],
  globs: string[]
): boolean {
  const matchers = globs.map(g => new Minimatch(g));
  for (const changedFile of changedFiles) {
    if (!isAllMatch(changedFile, matchers)) {
      core.debug(`   "all" patterns did not match against ${changedFile}`);
      return false;
    }
  }

  core.debug(`   "all" patterns matched all files`);
  return true;
}
