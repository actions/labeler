import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';
import {Minimatch} from 'minimatch';

async function run(): Promise<void> {
  try {
    const token = core.getInput('repo-token', {required: true});
    const configPath = core.getInput('configuration-path', {required: true});
    const notFoundLabel = core.getInput('not-found-label');
    const operationsPerRun = parseInt(
      core.getInput('operations-per-run', {required: true})
    );
    let operationsLeft = operationsPerRun;

    const client = new github.GitHub(token);

    const prNumber = getPrNumber();
    if (prNumber) {
      await processPR(client, prNumber, configPath, notFoundLabel);
      return;
    }

    const opts = await client.pulls.list.endpoint.merge({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      state: 'open',
      sort: 'updated'
    });

    let prs = await client.paginate(opts);
    prs = prs.filter(pr => {
      const hasLabels = pr.labels && pr.labels.length > 0;
      if (hasLabels) {
        core.debug(
          `pr ${pr.number} already has ${pr.labels.length} labels`
        );
      }
      return !hasLabels;
    });

    for (const pr of prs) {
      core.debug(`performing labeler at pr ${pr.number}`);
      if (operationsLeft <= 0) {
        core.warning(
          `performed ${operationsPerRun} operations, exiting to avoid rate limit`
        );
        return;
      }

      if (await processPR(client, pr.number, configPath, notFoundLabel)) {
        operationsLeft -= 1;
      }
    };
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

async function processPR(
  client: github.GitHub,
  prNumber: number,
  configPath: string,
  notFoundLabel: string
): Promise<boolean> {
  try {
    core.debug(`fetching changed files for pr #${prNumber}`);
    const changedFiles: string[] = await getChangedFiles(client, prNumber);
    const labelGlobs: Map<string, string[]> = await getLabelGlobs(
      client,
      configPath
    );

    const labels: string[] = [];
    for (const [label, globs] of labelGlobs.entries()) {
      core.debug(`processing ${label}`);
      if (checkGlobs(changedFiles, globs)) {
        labels.push(label);
      }
    }

    if (notFoundLabel && labels.length === 0) {
      labels.push(notFoundLabel);
    }

    if (labels.length > 0) {
      await addLabels(client, prNumber, labels);
      return true;
    }
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
  return false;
}

function getPrNumber(): number | undefined {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.number;
}

async function getChangedFiles(
  client: github.GitHub,
  prNumber: number
): Promise<string[]> {
  const listFilesResponse = await client.pulls.listFiles({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNumber
  });

  const changedFiles = listFilesResponse.data.map(f => f.filename);

  core.debug('found changed files:');
  for (const file of changedFiles) {
    core.debug('  ' + file);
  }

  return changedFiles;
}

async function getLabelGlobs(
  client: github.GitHub,
  configurationPath: string
): Promise<Map<string, string[]>> {
  const configurationContent: string = await fetchContent(
    client,
    configurationPath
  );

  // loads (hopefully) a `{[label:string]: string | string[]}`, but is `any`:
  const configObject: any = yaml.safeLoad(configurationContent);

  // transform `any` => `Map<string,string[]>` or throw if yaml is malformed:
  return getLabelGlobMapFromObject(configObject);
}

async function fetchContent(
  client: github.GitHub,
  repoPath: string
): Promise<string> {
  const response = await client.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: repoPath,
    ref: github.context.sha
  });

  return Buffer.from(response.data.content, 'base64').toString();
}

function getLabelGlobMapFromObject(configObject: any): Map<string, string[]> {
  const labelGlobs: Map<string, string[]> = new Map();
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

function checkGlobs(changedFiles: string[], globs: string[]): boolean {
  for (const glob of globs) {
    core.debug(` checking pattern ${glob}`);
    const matcher = new Minimatch(glob);
    for (const changedFile of changedFiles) {
      core.debug(` - ${changedFile}`);
      if (matcher.match(changedFile)) {
        core.debug(` ${changedFile} matches`);
        return true;
      }
    }
  }
  return false;
}

async function addLabels(
  client: github.GitHub,
  prNumber: number,
  labels: string[]
) {
  await client.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels: labels
  });
}

run();
