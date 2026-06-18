import * as core from '@actions/core';
import * as github from '@actions/github';

const getPrNumberFromContext = () =>
  github.context.payload.pull_request?.number;

const sanitizeForWarning = (value: string): string => {
  return value.replace(
    /[\x00-\x1F\x7F-\x9F]/g,
    c => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`
  );
};

export const getPrNumbers = (): number[] => {
  const prInput = core.getMultilineInput('pr-number');

  if (!prInput?.length) {
    return [getPrNumberFromContext()].filter(Boolean) as number[];
  }

  const result: number[] = [];

  for (const line of prInput) {
    const trimmed = line.trim();
    const prNumber = parseInt(trimmed, 10);

    if (isNaN(prNumber) || prNumber <= 0 || String(prNumber) !== trimmed) {
      const sanitized = sanitizeForWarning(line);
      const hint =
        sanitized !== line
          ? ' (non-printable characters were escaped as \\xNN)'
          : '';
      core.warning(`'${sanitized}' is not a valid pull request number${hint}`);
      continue;
    }

    result.push(prNumber);
  }

  return result;
};
