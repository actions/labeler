import * as core from '@actions/core';
import * as github from '@actions/github';
import {ClientType} from './types.js';

const COMPARE_API_FILE_LIMIT = 300;

export const getChangedFiles = async (
  client: ClientType,
  prNumber: number,
  baseRef?: string,
  headSha?: string
): Promise<string[]> => {
  if (baseRef && headSha) {
    core.debug(
      `using compare API for pr #${prNumber}: ${baseRef}...${headSha}`
    );
    const response = await client.rest.repos.compareCommitsWithBasehead({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      basehead: `${baseRef}...${headSha}`
    });

    const compareFiles = (response.data.files ?? []).map(f => f.filename);

    if (compareFiles.length >= COMPARE_API_FILE_LIMIT) {
      core.info(
        `compare API returned ${compareFiles.length} files (at or above ${COMPARE_API_FILE_LIMIT} limit), ` +
          `falling back to pulls.listFiles for pr #${prNumber}`
      );
      return getChangedFilesFromListFiles(client, prNumber);
    }

    core.debug('found changed files (compare):');
    for (const file of compareFiles) {
      core.debug('  ' + file);
    }

    return compareFiles;
  }

  return getChangedFilesFromListFiles(client, prNumber);
};

const getChangedFilesFromListFiles = async (
  client: ClientType,
  prNumber: number
): Promise<string[]> => {
  core.debug(`using pulls.listFiles for pr #${prNumber}`);
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
};
