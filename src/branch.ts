import * as core from '@actions/core';
import * as github from '@actions/github';

function getHeadBranchName(): string | undefined {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.head?.ref;
}

export function checkBranch(glob: string[]): boolean {
  const branchName = getHeadBranchName();
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
