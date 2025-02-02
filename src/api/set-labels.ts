import * as github from '@actions/github';
import {ClientType} from './types';

export const setLabels = async (
  client: ClientType,
  prNumber: number,
  labels: [string, string][]
) => {
  await client.rest.issues.setLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels: labels.map(([label]) => label)
  });

  for (const [label, color] of labels) {
    if (color) {
      await client.rest.issues.updateLabel({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        name: label,
        color: color?.replace('#', '')
      });
    }
  }
};
