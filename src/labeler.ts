import * as core from '@actions/core';
import * as github from '@actions/github';
import * as pluginRetry from '@octokit/plugin-retry';
import * as api from './api';
import isEqual from 'lodash.isequal';
import {getInputs} from './get-inputs';

import {BaseMatchConfig, MatchConfig} from './api/get-label-configs';

import {checkAllChangedFiles, checkAnyChangedFiles} from './changedFiles';

import {checkAnyBranch, checkAllBranch} from './branch';

type ClientType = ReturnType<typeof github.getOctokit>;

// GitHub Issues cannot have more than 100 labels
const GITHUB_MAX_LABELS = 100;

export const run = () =>
  labeler().catch(error => {
    core.error(error);
    core.setFailed(error.message);
  });

async function labeler() {
  const {token, configPath, syncLabels, dot, prNumbers} = getInputs();

  if (!prNumbers.length) {
    core.warning('Could not get pull request number(s), exiting');
    return;
  }

  const client: ClientType = github.getOctokit(token, {}, pluginRetry.retry);

  const pullRequests = api.getPullRequests(client, prNumbers);

  for await (const pullRequest of pullRequests) {
    const labelConfigs: Map<string, MatchConfig[]> = await api.getLabelConfigs(
      client,
      configPath
    );
    const preexistingLabels = pullRequest.data.labels.map(l => l.name);
    const allLabels: Set<string> = new Set<string>(preexistingLabels);

    for (const [label, configs] of labelConfigs.entries()) {
      core.debug(`processing ${label}`);
      if (checkMatchConfigs(pullRequest.changedFiles, configs, dot)) {
        allLabels.add(label);
      } else if (syncLabels) {
        allLabels.delete(label);
      }
    }

    const labelsToAdd = [...allLabels].slice(0, GITHUB_MAX_LABELS);
    const excessLabels = [...allLabels].slice(GITHUB_MAX_LABELS);

    let newLabels: string[] = [];

    try {
      if (!isEqual(labelsToAdd, preexistingLabels)) {
        await api.setLabels(client, pullRequest.number, labelsToAdd);
        newLabels = labelsToAdd.filter(
          label => !preexistingLabels.includes(label)
        );
      }
    } catch (error: any) {
      if (
        error.name !== 'HttpError' ||
        error.message !== 'Resource not accessible by integration'
      ) {
        throw error;
      }

      core.warning(
        `The action requires write permission to add labels to pull requests. For more information please refer to the action documentation: https://github.com/actions/labeler#recommended-permissions`,
        {
          title: `${process.env['GITHUB_ACTION_REPOSITORY']} running under '${github.context.eventName}' is misconfigured`
        }
      );

      core.setFailed(error.message);

      return;
    }

    core.setOutput('new-labels', newLabels.join(','));
    core.setOutput('all-labels', labelsToAdd.join(','));

    if (excessLabels.length) {
      core.warning(
        `Maximum of ${GITHUB_MAX_LABELS} labels allowed. Excess labels: ${excessLabels.join(
          ', '
        )}`,
        {title: 'Label limit for a PR exceeded'}
      );
    }
  }
}

export function checkMatchConfigs(
  changedFiles: string[],
  matchConfigs: MatchConfig[],
  dot: boolean
): boolean {
  for (const config of matchConfigs) {
    core.debug(` checking config ${JSON.stringify(config)}`);
    if (!checkMatch(changedFiles, config, dot)) {
      return false;
    }
  }

  return true;
}

function checkMatch(
  changedFiles: string[],
  matchConfig: MatchConfig,
  dot: boolean
): boolean {
  if (!Object.keys(matchConfig).length) {
    core.debug(`  no "any" or "all" patterns to check`);
    return false;
  }

  if (matchConfig.all) {
    if (!checkAll(matchConfig.all, changedFiles, dot)) {
      return false;
    }
  }

  if (matchConfig.any) {
    if (!checkAny(matchConfig.any, changedFiles, dot)) {
      return false;
    }
  }

  return true;
}

// equivalent to "Array.some()" but expanded for debugging and clarity
export function checkAny(
  matchConfigs: BaseMatchConfig[],
  changedFiles: string[],
  dot: boolean
): boolean {
  core.debug(`  checking "any" patterns`);
  if (
    !matchConfigs.length ||
    !matchConfigs.some(configOption => Object.keys(configOption).length)
  ) {
    core.debug(`  no "any" patterns to check`);
    return false;
  }

  for (const matchConfig of matchConfigs) {
    if (matchConfig.baseBranch) {
      if (checkAnyBranch(matchConfig.baseBranch, 'base')) {
        core.debug(`  "any" patterns matched`);
        return true;
      }
    }

    if (matchConfig.changedFiles) {
      if (checkAnyChangedFiles(changedFiles, matchConfig.changedFiles, dot)) {
        core.debug(`  "any" patterns matched`);
        return true;
      }
    }

    if (matchConfig.headBranch) {
      if (checkAnyBranch(matchConfig.headBranch, 'head')) {
        core.debug(`  "any" patterns matched`);
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
  changedFiles: string[],
  dot: boolean
): boolean {
  core.debug(`  checking "all" patterns`);
  if (
    !matchConfigs.length ||
    !matchConfigs.some(configOption => Object.keys(configOption).length)
  ) {
    core.debug(`  no "all" patterns to check`);
    return false;
  }

  for (const matchConfig of matchConfigs) {
    if (matchConfig.baseBranch) {
      if (!checkAllBranch(matchConfig.baseBranch, 'base')) {
        core.debug(`  "all" patterns did not match`);
        return false;
      }
    }

    if (matchConfig.changedFiles) {
      if (!changedFiles.length) {
        core.debug(`  no files to check "changed-files" patterns against`);
        return false;
      }

      if (!checkAllChangedFiles(changedFiles, matchConfig.changedFiles, dot)) {
        core.debug(`  "all" patterns did not match`);
        return false;
      }
    }

    if (matchConfig.headBranch) {
      if (!checkAllBranch(matchConfig.headBranch, 'head')) {
        core.debug(`  "all" patterns did not match`);
        return false;
      }
    }
  }

  core.debug(`  "all" patterns matched all configs`);
  return true;
}
