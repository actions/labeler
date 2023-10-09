import * as core from '@actions/core';
import * as github from '@actions/github';
import * as pluginRetry from '@octokit/plugin-retry';
import {Minimatch} from 'minimatch';
import * as api from './api';
import isEqual from 'lodash.isequal';
import {printPattern} from './utils';
import {getInputs} from './get-inputs';

interface MatchConfig {
  all?: string[];
  any?: string[];
}

type StringOrMatchConfig = string | MatchConfig;
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
    const labelGlobs: Map<string, StringOrMatchConfig[]> =
      await api.getLabelGlobs(client, configPath);
    const preexistingLabels = pullRequest.data.labels.map(l => l.name);
    const allLabels: Set<string> = new Set<string>(preexistingLabels);

    for (const [label, globs] of labelGlobs.entries()) {
      core.debug(`processing ${label}`);
      if (checkGlobs(pullRequest.changedFiles, globs, dot)) {
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
        `The action requires write permission to add labels to pull requests. For more information please refer to the action documentation: https://github.com/actions/labeler#permissions`,
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

function toMatchConfig(config: StringOrMatchConfig): MatchConfig {
  if (typeof config === 'string') {
    return {
      any: [config]
    };
  }

  return config;
}

export function checkGlobs(
  changedFiles: string[],
  globs: StringOrMatchConfig[],
  dot: boolean
): boolean {
  for (const glob of globs) {
    core.debug(` checking pattern ${JSON.stringify(glob)}`);
    const matchConfig = toMatchConfig(glob);
    if (checkMatch(changedFiles, matchConfig, dot)) {
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
function checkAny(
  changedFiles: string[],
  globs: string[],
  dot: boolean
): boolean {
  const matchers = globs.map(g => new Minimatch(g, {dot}));
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
function checkAll(
  changedFiles: string[],
  globs: string[],
  dot: boolean
): boolean {
  const matchers = globs.map(g => new Minimatch(g, {dot}));
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

function checkMatch(
  changedFiles: string[],
  matchConfig: MatchConfig,
  dot: boolean
): boolean {
  if (matchConfig.all !== undefined) {
    if (!checkAll(changedFiles, matchConfig.all, dot)) {
      return false;
    }
  }

  if (matchConfig.any !== undefined) {
    if (!checkAny(changedFiles, matchConfig.any, dot)) {
      return false;
    }
  }

  return true;
}
