import {checkGlobs, MatchConfig} from '../src/labeler';

import * as core from '@actions/core';

jest.mock('@actions/core');

beforeAll(() => {
  jest.spyOn(core, 'getInput').mockImplementation((name, options) => {
    return jest.requireActual('@actions/core').getInput(name, options);
  });
});

// I have to double cast here as this is what the output from js-yaml looks like which then gets
// transformed in toMatchConfig
const matchConfig = [
  {'changed-files': [{any: ['*.txt']}]}
] as unknown as MatchConfig[];

describe('checkGlobs', () => {
  it('returns true when our pattern does match changed files', () => {
    const changedFiles = ['foo.txt', 'bar.txt'];
    const result = checkGlobs(changedFiles, matchConfig);

    expect(result).toBeTruthy();
  });

  it('returns false when our pattern does not match changed files', () => {
    const changedFiles = ['foo.docx'];
    const result = checkGlobs(changedFiles, matchConfig);

    expect(result).toBeFalsy();
  });
});
