import {
  checkMatchConfigs,
  checkSizeConfigs,
  MatchConfig,
  toMatchConfig,
  getLabelConfigMapFromObject,
  getSizeConfigMapFromObject,
  BaseMatchConfig,
  PrFileType
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

describe('getSizeConfigMapFromObject', () => {
  describe('get default sizes when size-config is present', () => {
    const yamlObject = loadYaml('__tests__/fixtures/no_size_config.yml');
    const expected = new Map<number, string>();
    expected.set(0, 'XS');
    expected.set(10, 'S');
    expected.set(30, 'M');
    expected.set(100, 'L');
    expected.set(500, 'XL');
    expected.set(1000, 'XXL');

    it('returns a SizeConfig', () => {
      const result = getSizeConfigMapFromObject(yamlObject);
      expect(result).toEqual(expected);
    });
  });

  describe('get configured sizes when size-config is present', () => {
    const yamlObject = loadYaml('__tests__/fixtures/all_options.yml');
    const expected = new Map<number, string>();
    expected.set(100, 'XS');
    expected.set(200, 'S');
    expected.set(500, 'M');
    expected.set(800, 'L');
    expected.set(1000, 'XL');
    expected.set(2000, 'XXL');

    it('returns a SizeConfig', () => {
      const result = getSizeConfigMapFromObject(yamlObject);
      expect(result).toEqual(expected);
    });
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
      const changedFiles: PrFileType[] = [
        {name: 'foo.txt', size: 6},
        {name: 'bar.txt', size: 20}
      ];
      const result = checkMatchConfigs(changedFiles, matchConfig);

      expect(result).toBeTruthy();
    });

    it('returns false when our pattern does not match changed files', () => {
      const changedFiles: PrFileType[] = [{name: 'foo.docx', size: 13}];
      const result = checkMatchConfigs(changedFiles, matchConfig);

      expect(result).toBeFalsy();
    });

    it('returns true when either the branch or changed files patter matches', () => {
      const matchConfig: MatchConfig[] = [
        {any: [{changedFiles: ['*.txt']}, {headBranch: ['some-branch']}]}
      ];
      const changedFiles: PrFileType[] = [
        {name: 'foo.txt', size: 6},
        {name: 'bar.txt', size: 20}
      ];

      const result = checkMatchConfigs(changedFiles, matchConfig);
      expect(result).toBe(true);
    });
  });

  describe('when multiple MatchConfigs are supplied', () => {
    const matchConfig: MatchConfig[] = [
      {any: [{changedFiles: ['*.txt']}]},
      {any: [{headBranch: ['some-branch']}]}
    ];
    const changedFiles: PrFileType[] = [
      {name: 'foo.txt', size: 6},
      {name: 'bar.md', size: 20}
    ];

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

describe('checkSizeConfigs', () => {
  describe('when a single size config is provided', () => {
    const sizeConfig: Map<number, string> = new Map<number, string>();
    sizeConfig.set(100, 'XS');
    sizeConfig.set(200, 'S');
    sizeConfig.set(500, 'M');
    sizeConfig.set(800, 'L');
    sizeConfig.set(1000, 'XL');
    sizeConfig.set(2000, 'XXL');

    it('returns size/XXS when the size is less than the smallest size', () => {
      const changedFiles: PrFileType[] = [
        {name: 'foo.txt', size: 10},
        {name: 'baz.txt', size: 10},
        {name: 'bar.txt', size: 10}
      ];
      const result = checkSizeConfigs(changedFiles, sizeConfig);

      expect(result).toBe('size/XXS');
    });

    it('returns size/XS when the size is less than the smallest size', () => {
      const changedFiles: PrFileType[] = [
        {name: 'foo.txt', size: 50},
        {name: 'baz.txt', size: 50},
        {name: 'bar.txt', size: 50}
      ];
      const result = checkSizeConfigs(changedFiles, sizeConfig);

      expect(result).toBe('size/XS');
    });

    it('returns size/S when the size is less than the smallest size', () => {
      const changedFiles: PrFileType[] = [
        {name: 'foo.txt', size: 100},
        {name: 'baz.txt', size: 100},
        {name: 'bar.txt', size: 100}
      ];
      const result = checkSizeConfigs(changedFiles, sizeConfig);

      expect(result).toBe('size/S');
    });

    it('returns size/M when the size is less than the smallest size', () => {
      const changedFiles: PrFileType[] = [
        {name: 'foo.txt', size: 200},
        {name: 'baz.txt', size: 200},
        {name: 'bar.txt', size: 200}
      ];
      const result = checkSizeConfigs(changedFiles, sizeConfig);

      expect(result).toBe('size/M');
    });

    it('returns size/L when the size is less than the smallest size', () => {
      const changedFiles: PrFileType[] = [
        {name: 'foo.txt', size: 300},
        {name: 'baz.txt', size: 300},
        {name: 'bar.txt', size: 300}
      ];
      const result = checkSizeConfigs(changedFiles, sizeConfig);

      expect(result).toBe('size/L');
    });

    it('returns size/XL when the size is less than the smallest size', () => {
      const changedFiles: PrFileType[] = [
        {name: 'foo.txt', size: 400},
        {name: 'baz.txt', size: 400},
        {name: 'bar.txt', size: 400}
      ];
      const result = checkSizeConfigs(changedFiles, sizeConfig);

      expect(result).toBe('size/XL');
    });

    it('returns size/XXL when the size is less than the smallest size', () => {
      const changedFiles: PrFileType[] = [
        {name: 'foo.txt', size: 700},
        {name: 'baz.txt', size: 700},
        {name: 'bar.txt', size: 700}
      ];
      const result = checkSizeConfigs(changedFiles, sizeConfig);

      expect(result).toBe('size/XXL');
    });
  });
});
