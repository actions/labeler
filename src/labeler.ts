import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';
import {Minimatch} from 'minimatch';

import {checkBranch, toBranchMatchConfig, BranchMatchConfig} from './branch';

interface ChangedFilesMatchConfig {
  changedFiles?: {
    all?: string[];
    any?: string[];
  };
}

export type MatchConfig = ChangedFilesMatchConfig & BranchMatchConfig;

type ClientType = ReturnType<typeof github.getOctokit>;

export async function run() {
  try {
    const token = core.getInput('repo-token');
    const configPath = core.getInput('configuration-path', {required: true});
    const syncLabels = !!core.getInput('sync-labels', {required: false});

    const prNumber = getPrNumber();
    if (!prNumber) {
      core.info('Could not get pull request number from context, exiting');
      return;
    }

    const client: ClientType = github.getOctokit(token);

    const {data: pullRequest} = await client.rest.pulls.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: prNumber
    });

    core.debug(`fetching changed files for pr #${prNumber}`);
    const changedFiles: string[] = await getChangedFiles(client, prNumber);
    const labelConfigs: Map<string, MatchConfig[]> = await getMatchConfigs(
      client,
      configPath
    );

    const labels: string[] = [];
    const labelsToRemove: string[] = [];
    for (const [label, configs] of labelConfigs.entries()) {
      core.debug(`processing ${label}`);
      if (checkGlobs(changedFiles, configs)) {
        labels.push(label);
      } else if (pullRequest.labels.find(l => l.name === label)) {
        labelsToRemove.push(label);
      }
    }

    if (labels.length > 0) {
      await addLabels(client, prNumber, labels);
    }

    if (syncLabels && labelsToRemove.length) {
      await removeLabels(client, prNumber, labelsToRemove);
    }
  } catch (error: any) {
    core.error(error);
    core.setFailed(error.message);
  }
}

function getPrNumber(): number | undefined {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.number;
}

async function getChangedFiles(
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

async function getMatchConfigs(
  client: ClientType,
  configurationPath: string
): Promise<Map<string, MatchConfig[]>> {
  const configurationContent: string = await fetchContent(
    client,
    configurationPath
  );

  // loads (hopefully) a `{[label:string]: string | StringOrMatchConfig[]}`, but is `any`:
  const configObject: any = yaml.load(configurationContent);

  // transform `any` => `Map<string,StringOrMatchConfig[]>` or throw if yaml is malformed:
  return getLabelConfigMapFromObject(configObject);
}

async function fetchContent(
  client: ClientType,
  repoPath: string
): Promise<string> {
  const response: any = await client.rest.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: repoPath,
    ref: github.context.sha
  });

  return Buffer.from(response.data.content, response.data.encoding).toString();
}

function getLabelConfigMapFromObject(
  configObject: any
): Map<string, MatchConfig[]> {
  const labelGlobs: Map<string, MatchConfig[]> = new Map();
  for (const label in configObject) {
    if (typeof configObject[label] === 'string') {
      labelGlobs.set(label, [configObject[label]]);
    } else if (configObject[label] instanceof Array) {
      labelGlobs.set(label, configObject[label]);
    } else {
      throw Error(
        `found unexpected type for label ${label} (should be string or array of globs)`
      );
    }
  }

  return labelGlobs;
}

function toChangedFilesMatchConfig(config: any): ChangedFilesMatchConfig {
  if (!config['changed-files']) {
    return {};
  }
  const changedFilesConfig = config['changed-files'];

  // If the value provided is a string or an array of strings then default to `any` matching
  if (typeof changedFilesConfig === 'string') {
    return {
      changedFiles: {
        any: [changedFilesConfig]
      }
    };
  }

  const changedFilesMatchConfig = {
    changedFiles: {}
  };

  if (Array.isArray(changedFilesConfig)) {
    if (changedFilesConfig.every(entry => typeof entry === 'string')) {
      changedFilesMatchConfig.changedFiles = {
        any: changedFilesConfig
      };
    } else {
      // If it is not an array of strings then it should be array of further config options
      // so assign them to our `changedFilesMatchConfig`
      changedFilesConfig.forEach(config => {
        // Make sure that the values that we assign to our match config are an array
        Object.entries(config).forEach(([key, value]) => {
          const element = {
            [key]: Array.isArray(value) ? value : [value]
          };
          Object.assign(changedFilesMatchConfig.changedFiles, element);
        });
      });
    }
  }

  return changedFilesMatchConfig;
}

function toMatchConfig(config: MatchConfig): MatchConfig {
  const changedFilesConfig = toChangedFilesMatchConfig(config);
  const branchConfig = toBranchMatchConfig(config);

  return {
    ...changedFilesConfig,
    ...branchConfig
  };
}

function printPattern(matcher: Minimatch): string {
  return (matcher.negate ? '!' : '') + matcher.pattern;
}

export function checkGlobs(
  changedFiles: string[],
  globs: MatchConfig[]
): boolean {
  for (const glob of globs) {
    core.debug(` checking pattern ${JSON.stringify(glob)}`);
    const matchConfig = toMatchConfig(glob);
    if (checkMatch(changedFiles, matchConfig)) {
      return true;
    }
  }
  return false;
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
function checkAny(changedFiles: string[], globs: string[]): boolean {
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
function checkAll(changedFiles: string[], globs: string[]): boolean {
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

function checkMatch(changedFiles: string[], matchConfig: MatchConfig): boolean {
  if (matchConfig.changedFiles?.all !== undefined) {
    if (checkAll(changedFiles, matchConfig.changedFiles.all)) {
      return true;
    }
  }

  if (matchConfig.changedFiles?.any !== undefined) {
    if (checkAny(changedFiles, matchConfig.changedFiles.any)) {
      return true;
    }
  }

  if (matchConfig.headBranch !== undefined) {
    if (checkBranch(matchConfig.headBranch, 'head')) {
      return true;
    }
  }

  if (matchConfig.baseBranch !== undefined) {
    if (checkBranch(matchConfig.baseBranch, 'base')) {
      return true;
    }
  }

  return false;
}

async function addLabels(
  client: ClientType,
  prNumber: number,
  labels: string[]
) {
  await client.rest.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels: labels
  });
}

async function removeLabels(
  client: ClientType,
  prNumber: number,
  labels: string[]
) {
  await Promise.all(
    labels.map(label =>
      client.rest.issues.removeLabel({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: prNumber,
        name: label
      })
    )
  );
}
