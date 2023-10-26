import * as core from '@actions/core';
import * as github from '@actions/github';

const getPrNumberFromContext = () =>
  github.context.payload.pull_request?.number;

export const getPrNumbers = (): number[] => {
  const prInput = core.getMultilineInput('pr-number');

  if (!prInput?.length) {
    return [getPrNumberFromContext()].filter(Boolean) as number[];
  }

  const result: number[] = [];

  for (const line of prInput) {
    const prNumber = parseInt(line, 10);

    if (isNaN(prNumber) && prNumber <= 0) {
      core.warning(`'${prNumber}' is not a valid pull request number`);
      continue;
    }

    result.push(prNumber);
  }

  return result;
};
