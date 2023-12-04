import * as yaml from 'js-yaml';
import * as core from '@actions/core';
import * as fs from 'fs';
import {checkMatchConfigs} from '../src/labeler';
import {
  MatchConfig,
  toMatchConfig,
  getLabelConfigMapFromObject,
  BaseMatchConfig
} from '../src/api/get-label-configs';

jest.mock('@actions/core');

beforeAll(() => {
  jest.spyOn(core, 'getInput').mockImplementation((name, options) => {
    return jest.requireActual('@actions/core').getInput(name, options);
  });
});

const loadYaml = (filepath: string) => {
  const loadedFile = fs.readFileSync(filepath);
  const content = Buffer.from(loadedFile).toString();
  return yaml.load(content);
};

describe('getLabelConfigMapFromObject', () => {
  const yamlObject = loadYaml('__tests__/fixtures/all_options.yml');
  const expected = new Map<string, MatchConfig[]>();
  expected.set('label1', [
    {
      any: [
        {changedFiles: [{anyGlobToAnyFile: ['glob']}]},
        {baseBranch: undefined, headBranch: ['regexp']},
        {baseBranch: ['regexp'], headBranch: undefined}
      ]
    },
    {
      all: [
        {changedFiles: [{allGlobsToAllFiles: ['glob']}]},
        {baseBranch: undefined, headBranch: ['regexp']},
        {baseBranch: ['regexp'], headBranch: undefined}
      ]
    }
  ]);
  expected.set('label2', [
    {
      any: [
        {changedFiles: [{anyGlobToAnyFile: ['glob']}]},
        {baseBranch: undefined, headBranch: ['regexp']},
        {baseBranch: ['regexp'], headBranch: undefined}
      ]
    }
  ]);

  it('returns a MatchConfig', () => {
    const result = getLabelConfigMapFromObject(yamlObject);
    expect(result).toEqual(expected);
  });
});

describe('toMatchConfig', () => {
  describe('when all expected config options are present', () => {
    const config = {
      'changed-files': [{'any-glob-to-any-file': ['testing-files']}],
      'head-branch': ['testing-head'],
      'base-branch': ['testing-base']
    };
    const expected: BaseMatchConfig = {
      changedFiles: [{anyGlobToAnyFile: ['testing-files']}],
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
  describe('when a single match config is provided', () => {
    const matchConfig: MatchConfig[] = [
      {any: [{changedFiles: [{anyGlobToAnyFile: ['*.txt']}]}]}
    ];

    it('returns true when our pattern does match changed files', () => {
      const changedFiles = ['foo.txt', 'bar.txt'];
      const result = checkMatchConfigs(changedFiles, matchConfig, false);

      expect(result).toBeTruthy();
    });

    it('returns false when our pattern does not match changed files', () => {
      const changedFiles = ['foo.docx'];
      const result = checkMatchConfigs(changedFiles, matchConfig, false);

      expect(result).toBeFalsy();
    });

    it('returns true when either the branch or changed files patter matches', () => {
      const matchConfig: MatchConfig[] = [
        {
          any: [
            {changedFiles: [{anyGlobToAnyFile: ['*.txt']}]},
            {headBranch: ['some-branch']}
          ]
        }
      ];
      const changedFiles = ['foo.txt', 'bar.txt'];

      const result = checkMatchConfigs(changedFiles, matchConfig, false);
      expect(result).toBe(true);
    });

    it('returns false for a file starting with dot if `dot` option is false', () => {
      const changedFiles = ['.foo.txt'];
      const result = checkMatchConfigs(changedFiles, matchConfig, false);

      expect(result).toBeFalsy();
    });

    it('returns true for a file starting with dot if `dot` option is true', () => {
      const changedFiles = ['.foo.txt'];
      const result = checkMatchConfigs(changedFiles, matchConfig, true);

      expect(result).toBeTruthy();
    });
  });

  describe('when multiple MatchConfigs are supplied', () => {
    const matchConfig: MatchConfig[] = [
      {any: [{changedFiles: [{anyGlobToAnyFile: ['*.txt']}]}]},
      {any: [{headBranch: ['some-branch']}]}
    ];
    const changedFiles = ['foo.txt', 'bar.md'];

    it('returns false when only one config matches', () => {
      const result = checkMatchConfigs(changedFiles, matchConfig, false);
      expect(result).toBe(false);
    });

    it('returns true when only both config matches', () => {
      const matchConfig: MatchConfig[] = [
        {any: [{changedFiles: [{anyGlobToAnyFile: ['*.txt']}]}]},
        {any: [{headBranch: ['head-branch']}]}
      ];
      const result = checkMatchConfigs(changedFiles, matchConfig, false);
      expect(result).toBe(true);
    });
  });
});
