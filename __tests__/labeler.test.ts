import {MatchConfig, checkGlobs} from '../src/labeler';

import * as core from '@actions/core';

jest.mock('@actions/core');

beforeAll(() => {
  jest.spyOn(core, 'getInput').mockImplementation((name, options) => {
    return jest.requireActual('@actions/core').getInput(name, options);
  });
});

const matchConfig: MatchConfig[] = [{any: ['*.txt']}];

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

  it('returns true when PR author is in the list of authors', () => {
    const matchConfigWithAuthor: MatchConfig[] = [
      {any: ['*.txt'], authors: ['monalisa', 'hubot']}
    ];
    const changedFiles = ['foo.txt'];

    const result = checkGlobs(changedFiles, matchConfigWithAuthor);
    expect(result).toBeTruthy();
  });

  it('returns false when PR author is not in the list of authors', () => {
    const matchConfigWithAuthor: MatchConfig[] = [
      {any: ['*.txt'], authors: ['foo', 'bar']}
    ];
    const changedFiles = ['foo.txt'];

    const result = checkGlobs(changedFiles, matchConfigWithAuthor);
    expect(result).toBeFalsy();
  });
});
