import * as github from '@actions/github';
import {ClientType} from './types.js';

export const addLabels = async (
  client: ClientType,
  prNumber: number,
  labels: string[]
) => {
  await client.rest.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels,
    request: {retries: 0}
  });
};
