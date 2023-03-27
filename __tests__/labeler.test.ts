import {
  checkMatchConfigs,
  MatchConfig,
  toMatchConfig,
  getLabelConfigMapFromObject,
  BaseMatchConfig
} from '../src/labeler';
import * as yaml from 'js-yaml';
import * as core from '@actions/core';
import * as fs from 'fs';

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
        {changedFiles: ['glob']},
        {baseBranch: undefined, headBranch: ['regexp']},
        {baseBranch: ['regexp'], headBranch: undefined}
      ]
    },
    {
      all: [
        {changedFiles: ['glob']},
        {baseBranch: undefined, headBranch: ['regexp']},
        {baseBranch: ['regexp'], headBranch: undefined}
      ]
    }
  ]);
  expected.set('label2', [
    {
      any: [
        {changedFiles: ['glob']},
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
      'changed-files': ['testing-files'],
      'head-branch': ['testing-head'],
      'base-branch': ['testing-base']
    };
    const expected: BaseMatchConfig = {
      changedFiles: ['testing-files'],
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
    const matchConfig: MatchConfig[] = [{any: [{changedFiles: ['*.txt']}]}];

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

    it('returns true when either the branch or changed files patter matches', () => {
      const matchConfig: MatchConfig[] = [
        {any: [{changedFiles: ['*.txt']}, {headBranch: ['some-branch']}]}
      ];
      const changedFiles = ['foo.txt', 'bar.txt'];

      const result = checkMatchConfigs(changedFiles, matchConfig);
      expect(result).toBe(true);
    });
  });

  describe('when multiple MatchConfigs are supplied', () => {
    const matchConfig: MatchConfig[] = [
      {any: [{changedFiles: ['*.txt']}]},
      {any: [{headBranch: ['some-branch']}]}
    ];
    const changedFiles = ['foo.txt', 'bar.md'];

    it('returns false when only one config matches', () => {
      const result = checkMatchConfigs(changedFiles, matchConfig);
      expect(result).toBe(false);
    });

    it('returns true when only both config matches', () => {
      const matchConfig: MatchConfig[] = [
        {any: [{changedFiles: ['*.txt']}]},
        {any: [{headBranch: ['head-branch']}]}
      ];
      const result = checkMatchConfigs(changedFiles, matchConfig);
      expect(result).toBe(true);
    });
  });
});
