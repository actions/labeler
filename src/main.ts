import * as core from "@actions/core";
import * as github from "@actions/github";
import * as yaml from "js-yaml";
import { Minimatch, IMinimatch } from "minimatch";

interface MatchConfig {
  all?: string[];
  any?: string[];
}

type StringOrMatchConfig = string | MatchConfig;

async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });
    const configPath = core.getInput("configuration-path", { required: true });
    const syncLabels = !!core.getInput("sync-labels", { required: false });

    const prNumber = getPrNumber();
    if (!prNumber) {
      console.log("Could not get pull request number from context, exiting");
      return;
    }

    const prTitle = getPrTitle();
    core.info(`prTitle: ${prTitle}`);

    const client = new github.GitHub(token);

    const { data: pullRequest } = await client.pulls.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: prNumber
    });

    const labels: string[] = [];
    const labelsToRemove: string[] = [];

    // add label based on title
    const labelTitleRegex: Map<string, RegExp[]> = await getLabelTitleRegex(
      client, 
      configPath
    );
    for (const [label, regexs] of labelTitleRegex.entries()) {
      core.debug(`processing ${label}`);
      if (checkRegexs(prTitle, regexs)) {
        labels.push(label);
      } else if (pullRequest.labels.find(l => l.name === label)) {
        labelsToRemove.push(label);
      }
    }

    // add label based on changed files
    core.debug(`fetching changed files for pr #${prNumber}`);
    const changedFiles: string[] = await getChangedFiles(client, prNumber);
    const labelGlobs: Map<string, StringOrMatchConfig[]> = await getLabelGlobs(
      client,
      configPath
    );

    for (const [label, globs] of labelGlobs.entries()) {
      core.debug(`processing ${label}`);
      if (checkGlobs(changedFiles, globs)) {
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
  } catch (error) {
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

function getPrTitle(): string {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return '';
  }

  return pullRequest.title;
}

async function getChangedFiles(
  client: github.GitHub,
  prNumber: number
): Promise<string[]> {
  const listFilesOptions = client.pulls.listFiles.endpoint.merge({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNumber
  });

  const listFilesResponse = await client.paginate(listFilesOptions);
  const changedFiles = listFilesResponse.map(f => f.filename);

  core.debug("found changed files:");
  for (const file of changedFiles) {
    core.debug("  " + file);
  }

  return changedFiles;
}

async function getLabelGlobs(
  client: github.GitHub,
  configurationPath: string
): Promise<Map<string, StringOrMatchConfig[]>> {
  const configurationContent: string = await fetchContent(
    client,
    configurationPath
  );

  // loads (hopefully) a `{[label:string]: string | StringOrMatchConfig[]}`, but is `any`:
  const configObject: any = yaml.safeLoad(configurationContent);

  // transform `any` => `Map<string,StringOrMatchConfig[]>` or throw if yaml is malformed:
  return getLabelGlobMapFromObject(configObject);
}

async function fetchContent(
  client: github.GitHub,
  repoPath: string
): Promise<string> {
  const response: any = await client.repos.getContents({
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
  for (const configType in configObject) {
    if (configType == "changed_file") {
      for (const label in configObject["changed_file"]) {
        const val = configObject["changed_file"][label]
        if (typeof val === "string") {
          labelGlobs.set(label, [val]);
        } else if (val instanceof Array) {
          labelGlobs.set(label, val);
        } else {
          throw Error(
            `found unexpected type for label ${label} (should be string or array of globs)`
          );
        }
      }
    }
  }

  return labelGlobs;
}

async function getLabelTitleRegex(
  client: github.GitHub,
  configurationPath: string
): Promise<Map<string, RegExp[]>> {
  const configurationContent: string = await fetchContent(
    client,
    configurationPath
  );

  // loads (hopefully) a `{[label:string]: string | StringOrMatchConfig[]}`, but is `any`:
  const configObject: any = yaml.safeLoad(configurationContent);

  // transform `any` => `Map<string,RegExp[]>` or throw if yaml is malformed:
  return getLabelTitleRegexMapFromObject(configObject);
}

function getLabelTitleRegexMapFromObject(
  configObject: any
): Map<string, RegExp[]> {
  const titleRegexs: Map<string, RegExp[]> = new Map();
  for (const configType in configObject) {
    if (configType == "title") {
      for (const label in configObject["title"]) {
        const val = configObject["title"][label];
        if (typeof val === "string") {
          titleRegexs.set(label, [new RegExp(val, 'i')]);
        } else if (val instanceof Array) {
          titleRegexs.set(label, val.map(regexStr => new RegExp(regexStr, 'i')) );
        } else {
          throw Error(
            `found unexpected type for label ${label} (should be string or array of regex)`
          );
        }
      }
    }
  }

  return titleRegexs;
}

function toMatchConfig(config: StringOrMatchConfig): MatchConfig {
  if (typeof config === "string") {
    return {
      any: [config]
    };
  }

  return config;
}

function printPattern(matcher: IMinimatch): string {
  return (matcher.negate ? "!" : "") + matcher.pattern;
}

function checkGlobs(
  changedFiles: string[],
  globs: StringOrMatchConfig[]
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

function checkRegexs(
  prTitle: string,
  regexs: RegExp[]
): boolean {
  for (const regex of regexs) {
    if (regex.test(prTitle)) {
      return true;
    }
  }
  return false;
}

function isMatch(changedFile: string, matchers: IMinimatch[]): boolean {
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
  if (matchConfig.all !== undefined) {
    if (!checkAll(changedFiles, matchConfig.all)) {
      return false;
    }
  }

  if (matchConfig.any !== undefined) {
    if (!checkAny(changedFiles, matchConfig.any)) {
      return false;
    }
  }

  return true;
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

async function removeLabels(
  client: github.GitHub,
  prNumber: number,
  labels: string[]
) {
  await Promise.all(
    labels.map(label =>
      client.issues.removeLabel({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: prNumber,
        name: label
      })
    )
  );
}

run();
