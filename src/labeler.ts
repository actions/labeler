import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';

import {
  ChangedFilesMatchConfig,
  getChangedFiles,
  toChangedFilesMatchConfig,
  checkAny,
  checkAll
} from './changedFiles';
import {checkBranch, toBranchMatchConfig, BranchMatchConfig} from './branch';

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
      if (checkMatchConfigs(changedFiles, configs)) {
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

async function getMatchConfigs(
  client: ClientType,
  configurationPath: string
): Promise<Map<string, MatchConfig[]>> {
  const configurationContent: string = await fetchContent(
    client,
    configurationPath
  );

  // loads (hopefully) a `{[label:string]: MatchConfig[]}`, but is `any`:
  const configObject: any = yaml.load(configurationContent);

  // transform `any` => `Map<string,MatchConfig[]>` or throw if yaml is malformed:
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
  const labelMap: Map<string, MatchConfig[]> = new Map();
  for (const label in configObject) {
    const configOptions = configObject[label];
    if (
      !Array.isArray(configOptions) ||
      !configOptions.every(opts => typeof opts === 'object')
    ) {
      throw Error(
        `found unexpected type for label ${label} (should be array of config options)`
      );
    }

    const matchConfigs = configOptions.map(toMatchConfig);
    labelMap.set(label, matchConfigs);
  }

  return labelMap;
}

export function toMatchConfig(config: any): MatchConfig {
  const changedFilesConfig = toChangedFilesMatchConfig(config);
  const branchConfig = toBranchMatchConfig(config);

  return {
    ...changedFilesConfig,
    ...branchConfig
  };
}

export function checkMatchConfigs(
  changedFiles: string[],
  matchConfigs: MatchConfig[]
): boolean {
  for (const config of matchConfigs) {
    core.debug(` checking config ${JSON.stringify(config)}`);
    if (!checkMatch(changedFiles, config)) {
      return false;
    }
  }
  return true;
}

function checkMatch(changedFiles: string[], matchConfig: MatchConfig): boolean {
  if (matchConfig.changedFiles?.all) {
    if (!checkAll(changedFiles, matchConfig.changedFiles.all)) {
      return false;
    }
  }

  if (matchConfig.changedFiles?.any) {
    if (!checkAny(changedFiles, matchConfig.changedFiles.any)) {
      return false;
    }
  }

  if (matchConfig.headBranch) {
    if (!checkBranch(matchConfig.headBranch, 'head')) {
      return false;
    }
  }

  if (matchConfig.baseBranch) {
    if (!checkBranch(matchConfig.baseBranch, 'base')) {
      return false;
    }
  }

  return true;
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
