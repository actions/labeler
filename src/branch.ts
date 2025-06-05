import * as core from '@actions/core';

export interface BranchMatchConfig {
  headBranch?: string[];
  baseBranch?: string[];
}

type BranchBase = 'base' | 'head';

export function toBranchMatchConfig(config: any): BranchMatchConfig {
  if (!config['head-branch'] && !config['base-branch']) {
    return {};
  }

  const branchConfig = {
    headBranch: config['head-branch'],
    baseBranch: config['base-branch']
  };

  for (const branchName in branchConfig) {
    if (typeof branchConfig[branchName] === 'string') {
      branchConfig[branchName] = [branchConfig[branchName]];
    }
  }

  return branchConfig;
}

export function getBranchName(
  prData: any,
  branchBase: BranchBase
): string | undefined {
  if (branchBase === 'base') {
    return prData.base?.ref;
  } else {
    return prData.head?.ref;
  }
}

export function checkAnyBranch(
  prData: any,
  regexps: string[],
  branchBase: BranchBase
): boolean {
  const branchName = getBranchName(prData, branchBase);
  if (!branchName) {
    core.debug(`   no branch name`);
    return false;
  }

  core.debug(`   checking "branch" pattern against ${branchName}`);
  const matchers = regexps.map(regexp => new RegExp(regexp));
  for (const matcher of matchers) {
    if (matchBranchPattern(matcher, branchName)) {
      core.debug(`   "branch" patterns matched against ${branchName}`);
      return true;
    }
  }

  core.debug(`   "branch" patterns did not match against ${branchName}`);
  return false;
}

export function checkAllBranch(
  prData: any,
  regexps: string[],
  branchBase: BranchBase
): boolean {
  const branchName = getBranchName(prData, branchBase);
  if (!branchName) {
    core.debug(`   cannot fetch branch name from the pull request`);
    return false;
  }

  core.debug(`   checking "branch" pattern against ${branchName}`);
  const matchers = regexps.map(regexp => new RegExp(regexp));
  for (const matcher of matchers) {
    if (!matchBranchPattern(matcher, branchName)) {
      core.debug(`   "branch" patterns did not match against ${branchName}`);
      return false;
    }
  }

  core.debug(`   "branch" patterns matched against ${branchName}`);
  return true;
}

function matchBranchPattern(matcher: RegExp, branchName: string): boolean {
  core.debug(`    - ${matcher}`);
  if (matcher.test(branchName)) {
    core.debug(`    "branch" pattern matched`);
    return true;
  }

  core.debug(`    ${matcher} did not match`);
  return false;
}
