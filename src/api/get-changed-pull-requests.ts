import * as core from '@actions/core';
import * as github from '@actions/github';
import {getChangedFiles} from './get-changed-files';
import {ClientType} from './types';

export async function* getPullRequests(
  client: ClientType,
  prNumbers: number[]
) {
  for (const prNumber of prNumbers) {
    core.debug(`looking for pr #${prNumber}`);
    let prData: any;
    try {
      const result = await client.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber
      });
      prData = result.data;
    } catch (error: any) {
      core.warning(`Could not find pull request #${prNumber}, skipping`);
      continue;
    }

    core.debug(`fetching changed files for pr #${prNumber}`);
    const changedFiles: string[] = await getChangedFiles(client, prNumber);
    if (!changedFiles.length) {
      core.warning(`Pull request #${prNumber} has no changed files, skipping`);
      continue;
    }

    yield {
      data: prData,
      number: prNumber,
      changedFiles
    };
  }
}
