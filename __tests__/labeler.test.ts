import {checkGlobs} from '../src/labeler';

import * as core from '@actions/core';

jest.mock('@actions/core');

beforeAll(() => {
  jest.spyOn(core, 'getInput').mockImplementation((name, options) => {
    return jest.requireActual('@actions/core').getInput(name, options);
  });
});

const matchConfig = [{any: ['*.txt']}];
const matchAllOfAnyConfig = [{allofany: ['*.txt', '*.md']}];

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

  it('returns true when our allofany pattern does match changed files', () => {
    const changedFiles = ['foo.txt', 'bar.md'];
    const result = checkGlobs(changedFiles, matchAllOfAnyConfig);

    expect(result).toBeTruthy();
  });

  it('returns false when our allofany pattern does not match changed files', () => {
    const changedFiles = ['foo.md', 'foo.docx'];
    const result = checkGlobs(changedFiles, matchAllOfAnyConfig);

    expect(result).toBeFalsy();
  });
});
