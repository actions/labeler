import {checkMatchConfigs, MatchConfig, toMatchConfig} from '../src/labeler';

import * as core from '@actions/core';

jest.mock('@actions/core');

beforeAll(() => {
  jest.spyOn(core, 'getInput').mockImplementation((name, options) => {
    return jest.requireActual('@actions/core').getInput(name, options);
  });
});

describe('toMatchConfig', () => {
  describe('when all expected config options are present', () => {
    const config = {
      'changed-files': [{any: ['testing-any']}, {all: ['testing-all']}],
      'head-branch': ['testing-head'],
      'base-branch': ['testing-base']
    };
    const expected: MatchConfig = {
      changedFiles: {
        all: ['testing-all'],
        any: ['testing-any']
      },
      headBranch: ['testing-head'],
      baseBranch: ['testing-base']
    };

    it('returns a MatchConfig object with all options', () => {
      const result = toMatchConfig(config);
      expect(result).toEqual(expected);
    });

    describe('and there are also unexpected options present', () => {
      config['test-test'] = 'testing';

      it('does not include the unexpected items in the returned MatchConfig object', () => {
        const result = toMatchConfig(config);
        expect(result).toEqual(expected);
      });
    });
  });
});

describe('checkMatchConfigs', () => {
  const matchConfig: MatchConfig[] = [{changedFiles: {any: ['*.txt']}}];

  it('returns true when our pattern does match changed files', () => {
    const changedFiles = ['foo.txt', 'bar.txt'];
    const result = checkMatchConfigs(changedFiles, matchConfig);

    expect(result).toBeTruthy();
  });

  it('returns false when our pattern does not match changed files', () => {
    const changedFiles = ['foo.docx'];
    const result = checkMatchConfigs(changedFiles, matchConfig);

    expect(result).toBeFalsy();
  });
});
