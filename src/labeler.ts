import * as core from '@actions/core';
import * as github from '@actions/github';
import * as pluginRetry from '@octokit/plugin-retry';
import * as yaml from 'js-yaml';
import {Minimatch} from 'minimatch';
import {getMultilineInput} from '@actions/core';

interface MatchConfig {
  all?: string[];
  any?: string[];
}

type StringOrMatchConfig = string | MatchConfig;
type ClientType = ReturnType<typeof github.getOctokit>;

// GitHub Issues cannot have more than 100 labels
const GITHUB_MAX_LABELS = 100;

export async function run() {
  try {
    const token = core.getInput('repo-token');
    const configPath = core.getInput('configuration-path', {required: true});
    const syncLabels = !!core.getInput('sync-labels');
    const dot = core.getBooleanInput('dot');

    const prNumbers = getPrNumbers();
    if (!prNumbers) {
      core.info('Could not get pull request number from context, exiting');
      return;
    }

    const client: ClientType = github.getOctokit(token, {}, pluginRetry.retry);

    for (const prNumber of prNumbers) {
      const {data: pullRequest} = await client.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber
      });

      core.debug(`fetching changed files for pr #${prNumbers}`);
      const changedFiles: string[] = await getChangedFiles(client, prNumber);
      const labelGlobs: Map<string, StringOrMatchConfig[]> =
        await getLabelGlobs(client, configPath);

      const preexistingLabels = pullRequest.labels.map(l => l.name);
      const allLabels: Set<string> = new Set<string>(preexistingLabels);

      for (const [label, globs] of labelGlobs.entries()) {
        core.debug(`processing ${label}`);
        if (checkGlobs(changedFiles, globs, dot)) {
          allLabels.add(label);
        } else if (syncLabels) {
          allLabels.delete(label);
        }
      }

      const labelsToAdd = [...allLabels].slice(0, GITHUB_MAX_LABELS);
      const excessLabels = [...allLabels].slice(GITHUB_MAX_LABELS);

      try {
        let newLabels: string[] = [];

      if (!isListEqual(labelsToAdd, preexistingLabels)) {
          await setLabels(client, prNumber, labelsToAdd);
        newLabels = labelsToAdd.filter(l => !preexistingLabels.includes(l));
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
      } catch (error: any) {
        if (
          error.name === 'HttpError' &&
          error.message === 'Resource not accessible by integration'
        ) {
          core.warning(
            `The action requires write permission to add labels to pull requests. For more information please refer to the action documentation: https://github.com/actions/labeler#permissions`,
            {
              title: `${process.env['GITHUB_ACTION_REPOSITORY']} running under '${github.context.eventName}' is misconfigured`
            }
          );
          core.setFailed(error.message);
        } else {
          throw error;
        }
      }
    }
  } catch (error: any) {
    core.error(error);
    core.setFailed(error.message);
  }
}

function getPrNumbers(): number[] | undefined {
  const pullRequestNumbers = core.getMultilineInput('pr-number', {
    required: false
  });
  if (pullRequestNumbers) {
    const prNumbers: number[] = [];

    for (const prNumber of pullRequestNumbers) {
      const prNumberInt = parseInt(prNumber, 10);
      if (isNaN(prNumberInt) || prNumberInt <= 0) {
        core.warning(`'${prNumber}' is not a valid pull request number`);
      } else {
        prNumbers.push(prNumberInt);
      }
    }

    return prNumbers;
  }

  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return [pullRequest.number];
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

async function getLabelGlobs(
  client: ClientType,
  configurationPath: string
): Promise<Map<string, StringOrMatchConfig[]>> {
  let configurationContent: string;
  try {
    configurationContent = await fetchContent(client, configurationPath);
  } catch (e: any) {
    if (e.name == 'HttpError' || e.name == 'NotFound') {
      core.warning(
        `The config file was not found at ${configurationPath}. Make sure it exists and that this action has the correct access rights.`
      );
    }
    throw e;
  }

  // loads (hopefully) a `{[label:string]: string | StringOrMatchConfig[]}`, but is `any`:
  const configObject: any = yaml.load(configurationContent);

  // transform `any` => `Map<string,StringOrMatchConfig[]>` or throw if yaml is malformed:
  return getLabelGlobMapFromObject(configObject);
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

function getLabelGlobMapFromObject(
  configObject: any
): Map<string, StringOrMatchConfig[]> {
  const labelGlobs: Map<string, StringOrMatchConfig[]> = new Map();
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

function toMatchConfig(config: StringOrMatchConfig): MatchConfig {
  if (typeof config === 'string') {
    return {
      any: [config]
    };
  }

  return config;
}

function printPattern(matcher: Minimatch): string {
  return (matcher.negate ? '!' : '') + matcher.pattern;
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

function isListEqual(listA: string[], listB: string[]): boolean {
  return listA.length === listB.length && listA.every(el => listB.includes(el));
}

async function setLabels(
  client: ClientType,
  prNumber: number,
  labels: string[]
) {
  await client.rest.issues.setLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels: labels
  });
}
