import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';

import {
  ChangedFilesMatchConfig,
  getChangedFiles,
  toChangedFilesMatchConfig,
  checkAllChangedFiles,
  checkAnyChangedFiles
} from './changedFiles';
import {
  checkAnyBranch,
  checkAllBranch,
  toBranchMatchConfig,
  BranchMatchConfig
} from './branch';

export type BaseMatchConfig = BranchMatchConfig & ChangedFilesMatchConfig;

export type MatchConfig = {
  any?: BaseMatchConfig[];
  all?: BaseMatchConfig[];
};

type ClientType = ReturnType<typeof github.getOctokit>;

export async function run() {
  try {
    const token = core.getInput('repo-token');
    const configPath = core.getInput('configuration-path', {required: true});
    const syncLabels = core.getBooleanInput('sync-labels');

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

export function getLabelConfigMapFromObject(
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
    const matchConfigs = configOptions.reduce<MatchConfig[]>(
      (updatedConfig, configValue) => {
        if (!configValue) {
          return updatedConfig;
        }

        Object.entries(configValue).forEach(([key, value]) => {
          // If the top level `any` or `all` keys are provided then set them, and convert their values to
          // our config objects.
          if (key === 'any' || key === 'all') {
            if (Array.isArray(value)) {
              const newConfigs = value.map(toMatchConfig);
              updatedConfig.push({[key]: newConfigs});
            }
          } else if (
            // These are the keys that we accept and know how to process
            ['changed-files', 'head-branch', 'base-branch'].includes(key)
          ) {
            const newMatchConfig = toMatchConfig({[key]: value});
            // Find or set the `any` key so that we can add these properties to that rule,
            // Or create a new `any` key and add that to our array of configs.
            const indexOfAny = updatedConfig.findIndex(mc => !!mc['any']);
            if (indexOfAny >= 0) {
              updatedConfig[indexOfAny].any?.push(newMatchConfig);
            } else {
              updatedConfig.push({any: [newMatchConfig]});
            }
          } else {
            // Log the key that we don't know what to do with.
            core.info(`An unknown config option was under ${label}: ${key}`);
          }
        });

        return updatedConfig;
      },
      []
    );

    if (matchConfigs.length) {
      labelMap.set(label, matchConfigs);
    }
  }

  return labelMap;
}

export function toMatchConfig(config: any): BaseMatchConfig {
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
  if (!Object.keys(matchConfig).length) {
    return false;
  }

  if (matchConfig.all) {
    if (!checkAll(matchConfig.all, changedFiles)) {
      return false;
    }
  }

  if (matchConfig.any) {
    if (!checkAny(matchConfig.any, changedFiles)) {
      return false;
    }
  }

  return true;
}

// equivalent to "Array.some()" but expanded for debugging and clarity
export function checkAny(
  matchConfigs: BaseMatchConfig[],
  changedFiles: string[]
): boolean {
  core.debug(`  checking "any" patterns`);
  if (!Object.keys(matchConfigs).length) {
    core.debug(`  no "any" patterns to check`);
    return false;
  }

  for (const matchConfig of matchConfigs) {
    if (matchConfig.baseBranch) {
      if (checkAnyBranch(matchConfig.baseBranch, 'base')) {
        return true;
      }
    }

    if (matchConfig.changedFiles) {
      if (checkAnyChangedFiles(changedFiles, matchConfig.changedFiles)) {
        return true;
      }
    }

    if (matchConfig.headBranch) {
      if (checkAnyBranch(matchConfig.headBranch, 'head')) {
        return true;
      }
    }
  }

  core.debug(`  "any" patterns did not match any configs`);
  return false;
}

// equivalent to "Array.every()" but expanded for debugging and clarity
export function checkAll(
  matchConfigs: BaseMatchConfig[],
  changedFiles: string[]
): boolean {
  core.debug(` checking "all" patterns`);
  if (!Object.keys(matchConfigs).length) {
    core.debug(`  no "all" patterns to check`);
    return false;
  }

  for (const matchConfig of matchConfigs) {
    if (matchConfig.baseBranch) {
      if (!checkAllBranch(matchConfig.baseBranch, 'base')) {
        return false;
      }
    }

    if (matchConfig.changedFiles) {
      if (checkAllChangedFiles(changedFiles, matchConfig.changedFiles)) {
        return true;
      }
    }

    if (matchConfig.headBranch) {
      if (!checkAllBranch(matchConfig.headBranch, 'head')) {
        return false;
      }
    }
  }

  core.debug(`  "all" patterns matched all files`);
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
