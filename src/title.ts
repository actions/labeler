import * as core from '@actions/core';
import * as github from '@actions/github';

export interface TitleMatchConfig {
  title?: string[];
}

export function toTitleMatchConfig(config: any): TitleMatchConfig {
  if (!config['title']) {
    return {};
  }

  const titleConfig = {
    title: config['title']
  };

  if (typeof titleConfig.title === 'string') {
    titleConfig.title = [titleConfig.title];
  }

  return titleConfig;
}

export function getTitle(): string | undefined {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.title;
}

export function checkAnyTitle(regexps: string[]): boolean {
  const title = getTitle();
  if (!title) {
    core.debug(`    cannot fetch title from the pull request`);
    return false;
  }

  core.debug(`    checking "title" pattern against ${title}`);
  const matchers = regexps.map(regexp => new RegExp(regexp));
  for (const matcher of matchers) {
    if (matchTitlePattern(matcher, title)) {
      core.debug(`    "title" patterns matched against ${title}`);
      return true;
    }
  }

  core.debug(`  "title" patterns did not match against ${title}`);
  return false;
}

export function checkAllTitle(regexps: string[]): boolean {
  const title = getTitle();
  if (!title) {
    core.debug(`   cannot fetch title from the pull request`);
    return false;
  }

  core.debug(`   checking "title" pattern against ${title}`);
  const matchers = regexps.map(regexp => new RegExp(regexp));
  for (const matcher of matchers) {
    if (!matchTitlePattern(matcher, title)) {
      core.debug(`   "title" patterns did not match against ${title}`);
      return false;
    }
  }

  core.debug(`   "title" patterns matched against ${title}`);
  return true;
}

function matchTitlePattern(matcher: RegExp, title: string): boolean {
  core.debug(`    - ${matcher}`);
  if (matcher.test(title)) {
    core.debug(`    "title" pattern matched`);
    return true;
  }

  core.debug(`    ${matcher} did not match`);
  return false;
}
