import * as github from '@actions/github';
import {ClientType} from './types.js';

const isServerError = (error: unknown): error is {status: number} =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof error.status === 'number' &&
  error.status >= 500 &&
  error.status < 600;

export const addLabels = async (
  client: ClientType,
  prNumber: number,
  labels: string[]
) => {
  const request = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber
  };

  try {
    await client.rest.issues.addLabels({
      ...request,
      labels,
      request: {retries: 0}
    });
  } catch (error: unknown) {
    if (!isServerError(error)) {
      throw error;
    }

    const currentLabelNames = new Set<string>();
    let page = 1;
    try {
      while (true) {
        const currentLabels = await client.rest.issues.listLabelsOnIssue({
          ...request,
          per_page: 100,
          page,
          request: {retries: 0}
        });

        for (const label of currentLabels.data) {
          currentLabelNames.add(label.name.toLowerCase());
        }

        if (labels.every(label => currentLabelNames.has(label.toLowerCase()))) {
          return;
        }

        if (!currentLabels.headers.link?.match(/;\s*rel="next"/)) {
          break;
        }

        page++;
      }
    } catch {
      throw error;
    }

    throw error;
  }
};
