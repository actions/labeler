import * as core from '@actions/core';
import * as github from '@actions/github';

export interface DraftMatchConfig {
  draft?: boolean;
}

export function toDraftMatchConfig(config: any): DraftMatchConfig {
  if (!Object.prototype.hasOwnProperty.call(config, 'draft')) {
    return {};
  }

  if (typeof config.draft !== 'boolean') {
    throw new Error(
      `The "draft" option must be a boolean (got ${JSON.stringify(config.draft)})`
    );
  }

  return {draft: config.draft};
}

export function getDraft(): boolean | undefined {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest || typeof pullRequest.draft !== 'boolean') {
    return undefined;
  }

  return pullRequest.draft;
}

export function checkDraft(expected: boolean, isDraft?: boolean): boolean {
  const draftStatus = isDraft ?? getDraft();
  if (draftStatus === undefined) {
    core.debug(`   cannot fetch draft status from the pull request`);
    return false;
  }

  core.debug(`   checking "draft" pattern against ${draftStatus}`);
  const matched = draftStatus === expected;
  if (matched) {
    core.debug(`   "draft" pattern matched`);
  } else {
    core.debug(`   "draft" pattern did not match`);
  }
  return matched;
}
