import * as core from '@actions/core';
import * as github from '@actions/github';

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

  if (branchConfig.headBranch) {
    const patterns = branchConfig.headBranch;
    if (typeof patterns === 'string') {
      branchConfig.headBranch = [patterns];
    }
  }

  if (branchConfig.baseBranch) {
    const patterns = branchConfig.baseBranch;
    if (typeof patterns === 'string') {
      branchConfig.baseBranch = [patterns];
    }
  }

  return branchConfig;
}

export function getBranchName(branchBase?: BranchBase): string | undefined {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  if (branchBase === 'base') {
    return pullRequest.base?.ref;
  } else {
    return pullRequest.head?.ref;
  }
}

export function checkBranch(glob: string[], branchBase?: BranchBase): boolean {
  const branchName = getBranchName(branchBase);
  if (!branchName) {
    core.debug(` no branch name`);
    return false;
  }

  core.debug(` checking "branch" pattern against ${branchName}`);
  const matchers = glob.map(g => new RegExp(g));
  for (const matcher of matchers) {
    if (matchBranchPattern(matcher, branchName)) {
      core.debug(`  "branch" patterns matched against ${branchName}`);
      return true;
    }
  }

  core.debug(`  "branch" patterns did not match against ${branchName}`);
  return false;
}

function matchBranchPattern(matcher: RegExp, branchName: string): boolean {
  core.debug(`  - ${matcher}`);
  if (matcher.test(branchName)) {
    core.debug(`   "branch" pattern matched`);
    return true;
  }

  core.debug(`   ${matcher} did not match`);
  return false;
}
