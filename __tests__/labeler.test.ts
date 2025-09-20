import * as yaml from 'js-yaml';
import * as core from '@actions/core';
import * as api from '../src/api';
import {labeler} from '../src/labeler';
import * as github from '@actions/github';
import * as fs from 'fs';
import {checkMatchConfigs} from '../src/labeler';
import {
  MatchConfig,
  toMatchConfig,
  getLabelConfigMapFromObject,
  BaseMatchConfig
} from '../src/api/get-label-configs';

jest.mock('@actions/core');
jest.mock('../src/api');

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
    },
    {
      none: [
        {changedFiles: [{allGlobsToAllFiles: ['notthisglob']}]},
        {baseBranch: undefined, headBranch: ['notthisone']},
        {baseBranch: ['notthisone'], headBranch: undefined}
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

    it('returns true when no files match the "none" config', () => {
      const matchConfig: MatchConfig[] = [
        {
          none: [
            {changedFiles: [{anyGlobToAnyFile: ['*.md']}]},
            {headBranch: ['some-branch']}
          ]
        }
      ];
      const changedFiles = ['foo.txt', 'bar.txt'];

      const result = checkMatchConfigs(changedFiles, matchConfig, false);
      expect(result).toBe(true);
    });

    it('returns false when files match the "none" config', () => {
      const matchConfig: MatchConfig[] = [
        {
          none: [
            {changedFiles: [{anyGlobToAnyFile: ['*.md']}]},
            {headBranch: ['some-branch']}
          ]
        }
      ];
      const changedFiles = ['foo.md', 'bar.md'];

      const result = checkMatchConfigs(changedFiles, matchConfig, false);
      expect(result).toBe(false);
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

describe('labeler error handling', () => {
  const mockClient = {} as any;
  const mockPullRequest = {
    number: 123,
    data: {labels: []},
    changedFiles: []
  };

  beforeEach(() => {
    jest.resetAllMocks();

    (github.getOctokit as jest.Mock).mockReturnValue(mockClient);
    (api.getPullRequests as jest.Mock).mockReturnValue([
      {
        ...mockPullRequest,
        data: {labels: [{name: 'old-label'}]}
      }
    ]);

    (api.getLabelConfigs as jest.Mock).mockResolvedValue(
      new Map([['new-label', ['dummy-config']]])
    );

    // Force match so "new-label" is always added
    jest.spyOn({checkMatchConfigs}, 'checkMatchConfigs').mockReturnValue(true);
  });

  it('throws a custom error for HttpError 403 with "unauthorized" message', async () => {
    (api.setLabels as jest.Mock).mockRejectedValue({
      name: 'HttpError',
      status: 403,
      message: 'Request failed with status code 403: Unauthorized'
    });

    await expect(labeler()).rejects.toThrow(
      /does not have permission to create labels/
    );
  });

  it('rethrows unexpected HttpError', async () => {
    const unexpectedError = {
      name: 'HttpError',
      status: 404,
      message: 'Not Found'
    };
    (api.setLabels as jest.Mock).mockRejectedValue(unexpectedError);

    // NOTE: In the current implementation, labeler rethrows the raw error object (not an Error instance).
    // `rejects.toThrow` only works with real Error objects, so here we must use `rejects.toEqual`.
    // If labeler is updated to always wrap errors in `Error`, this test can be changed to use `rejects.toThrow`.
    await expect(labeler()).rejects.toEqual(unexpectedError);
  });

  it('handles "Resource not accessible by integration" gracefully', async () => {
    const error = {
      name: 'HttpError',
      message: 'Resource not accessible by integration'
    };
    (api.setLabels as jest.Mock).mockRejectedValue(error);

    await labeler();

    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining("requires 'issues: write'"),
      expect.any(Object)
    );
    expect(core.setFailed).toHaveBeenCalledWith(error.message);
  });
});
