import {jest, describe, it, expect} from '@jest/globals';
import type {ChangedFilesMatchConfig} from '../src/changedFiles.js';

jest.unstable_mockModule('@actions/core', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
}));

jest.unstable_mockModule('@actions/github', () => ({
  context: {
    payload: {
      pull_request: {number: 123, head: {ref: 'head'}, base: {ref: 'base'}}
    },
    repo: {owner: 'monalisa', repo: 'helloworld'}
  },
  getOctokit: jest.fn()
}));

const {
  checkAllChangedFiles,
  checkAnyChangedFiles,
  toChangedFilesMatchConfig,
  checkIfAnyGlobMatchesAnyFile,
  checkIfAllGlobsMatchAnyFile,
  checkIfAnyGlobMatchesAllFiles,
  checkIfAllGlobsMatchAllFiles
} = await import('../src/changedFiles.js');

describe('checkAllChangedFiles', () => {
  const changedFiles = ['foo.txt', 'bar.txt'];

  describe('when all given glob pattern configs matched', () => {
    const globPatternsConfigs = [
      {anyGlobToAnyFile: ['foo.txt']},
      {anyGlobToAllFiles: ['*.txt']},
      {allGlobsToAllFiles: ['**']}
    ];

    it('returns true', () => {
      const result = checkAllChangedFiles(
        changedFiles,
        globPatternsConfigs,
        false,
        false
      );
      expect(result).toBe(true);
    });
  });

  describe(`when some given glob pattern config did not match`, () => {
    const globPatternsConfigs = [
      {anyGlobToAnyFile: ['*.md']},
      {anyGlobToAllFiles: ['*.txt']},
      {allGlobsToAllFiles: ['**']}
    ];

    it('returns false', () => {
      const result = checkAllChangedFiles(
        changedFiles,
        globPatternsConfigs,
        false,
        false
      );
      expect(result).toBe(false);
    });
  });
});

describe('checkAnyChangedFiles', () => {
  const changedFiles = ['foo.txt', 'bar.txt'];

  describe('when any given glob pattern config matched', () => {
    const globPatternsConfigs = [
      {anyGlobToAnyFile: ['*.md']},
      {anyGlobToAllFiles: ['*.txt']}
    ];

    it('returns true', () => {
      const result = checkAnyChangedFiles(
        changedFiles,
        globPatternsConfigs,
        false,
        false
      );
      expect(result).toBe(true);
    });
  });

  describe('when none of the given glob pattern configs matched', () => {
    const globPatternsConfigs = [
      {anyGlobToAnyFile: ['*.md']},
      {anyGlobToAllFiles: ['!*.txt']}
    ];

    it('returns false', () => {
      const result = checkAnyChangedFiles(
        changedFiles,
        globPatternsConfigs,
        false,
        false
      );
      expect(result).toBe(false);
    });
  });
});

describe('toChangedFilesMatchConfig', () => {
  describe(`when there is no 'changed-files' key in the config`, () => {
    const config = {'head-branch': 'test'};

    it('returns an empty object', () => {
      const result = toChangedFilesMatchConfig(config);
      expect(result).toEqual({});
    });
  });

  describe(`when there is a 'changed-files' key in the config`, () => {
    describe('but the glob pattern config key is not provided', () => {
      const config = {'changed-files': ['bar']};

      it('throws the error', () => {
        expect(() => {
          toChangedFilesMatchConfig(config);
        }).toThrow(
          `The "changed-files" section must have a valid config structure. Please read the action documentation for more information`
        );
      });
    });

    describe('but the glob pattern config key is not valid', () => {
      const config = {'changed-files': [{NotValidConfigKey: ['bar']}]};

      it('throws the error', () => {
        expect(() => {
          toChangedFilesMatchConfig(config);
        }).toThrow(
          `Unknown config options were under "changed-files": NotValidConfigKey`
        );
      });
    });

    describe('and the glob pattern config key is provided', () => {
      describe('and the value is an array of strings', () => {
        const config = {
          'changed-files': [{'any-glob-to-any-file': ['testing']}]
        };

        it('sets the value in the config object', () => {
          const result = toChangedFilesMatchConfig(config);
          expect(result).toEqual({
            changedFiles: [{anyGlobToAnyFile: ['testing']}]
          });
        });
      });

      describe('and the value is a string', () => {
        const config = {'changed-files': [{'any-glob-to-any-file': 'testing'}]};

        it(`sets the string as an array in the config object`, () => {
          const result = toChangedFilesMatchConfig(config);
          expect(result).toEqual({
            changedFiles: [{anyGlobToAnyFile: ['testing']}]
          });
        });
      });
    });
  });
});

describe('checkIfAnyGlobMatchesAnyFile', () => {
  const changedFiles = ['foo.txt', 'bar.txt'];

  describe('when any given glob pattern matched any file', () => {
    const globPatterns = ['*.md', 'foo.txt'];

    it('returns true', () => {
      const result = checkIfAnyGlobMatchesAnyFile(
        changedFiles,
        globPatterns,
        false,
        false
      );
      expect(result).toBe(true);
    });
  });

  describe('when none of the given glob pattern matched any file', () => {
    const globPatterns = ['*.md', '!*.txt'];

    it('returns false', () => {
      const result = checkIfAnyGlobMatchesAnyFile(
        changedFiles,
        globPatterns,
        false,
        false
      );
      expect(result).toBe(false);
    });
  });
});

describe('checkIfAllGlobsMatchAnyFile', () => {
  const changedFiles = ['foo.txt', 'bar.txt'];

  describe('when all given glob patterns matched any file', () => {
    const globPatterns = ['**/bar.txt', 'bar.txt'];

    it('returns true', () => {
      const result = checkIfAllGlobsMatchAnyFile(
        changedFiles,
        globPatterns,
        false,
        false
      );
      expect(result).toBe(true);
    });
  });

  describe('when some of the given glob patterns did not match any file', () => {
    const globPatterns = ['*.txt', '*.md'];

    it('returns false', () => {
      const result = checkIfAllGlobsMatchAnyFile(
        changedFiles,
        globPatterns,
        false,
        false
      );
      expect(result).toBe(false);
    });
  });
});

describe('checkIfAnyGlobMatchesAllFiles', () => {
  const changedFiles = ['foo.txt', 'bar.txt'];

  describe('when any given glob pattern matched all files', () => {
    const globPatterns = ['*.md', '*.txt'];

    it('returns true', () => {
      const result = checkIfAnyGlobMatchesAllFiles(
        changedFiles,
        globPatterns,
        false,
        false
      );
      expect(result).toBe(true);
    });
  });

  describe('when none of the given glob patterns matched all files', () => {
    const globPatterns = ['*.md', 'bar.txt', 'foo.txt'];

    it('returns false', () => {
      const result = checkIfAnyGlobMatchesAllFiles(
        changedFiles,
        globPatterns,
        false,
        false
      );
      expect(result).toBe(false);
    });
  });
});

describe('checkIfAllGlobsMatchAllFiles', () => {
  const changedFiles = ['foo.txt', 'bar.txt'];

  describe('when all given glob patterns matched all files', () => {
    const globPatterns = ['*.txt', '**'];

    it('returns true', () => {
      const result = checkIfAllGlobsMatchAllFiles(
        changedFiles,
        globPatterns,
        false,
        false
      );
      expect(result).toBe(true);
    });
  });

  describe('when some of the given glob patterns did not match all files', () => {
    const globPatterns = ['**', 'foo.txt'];

    it('returns false', () => {
      const result = checkIfAllGlobsMatchAllFiles(
        changedFiles,
        globPatterns,
        false,
        false
      );
      expect(result).toBe(false);
    });
  });
});

// Each scenario's glob patterns differ from its changed files by letter case
// only, so every pattern matches every file when `nocase` is true and none of
// them match when it is false.
const NOCASE_SCENARIOS = [
  {
    description: 'a CamelCase directory name',
    changedFiles: ['src/MyComponent/Button.tsx', 'src/MyComponent/Icon.tsx'],
    globPatterns: ['src/mycomponent/**', 'SRC/mycomponent/*.tsx']
  },
  {
    description: 'a CamelCase file name',
    changedFiles: ['src/MyComponent.tsx', 'src/MyHelper.tsx'],
    globPatterns: ['src/my*.tsx', 'src/MY*.TSX']
  },
  {
    description: 'an uppercased file extension',
    changedFiles: ['src/foo.md', 'src/bar.md'],
    globPatterns: ['**/*.MD', 'SRC/*.md']
  },
  {
    description: 'lowercased files and CamelCase patterns',
    changedFiles: ['docs/readme.md', 'docs/contributing.md'],
    globPatterns: ['Docs/*.md', 'docs/*.Md']
  }
];

describe('`nocase` option', () => {
  describe.each(NOCASE_SCENARIOS)(
    'with $description',
    ({changedFiles, globPatterns}) => {
      describe('checkIfAnyGlobMatchesAnyFile', () => {
        it('returns false when `nocase` is false', () => {
          const result = checkIfAnyGlobMatchesAnyFile(
            changedFiles,
            globPatterns,
            false,
            false
          );
          expect(result).toBe(false);
        });

        it('returns true when `nocase` is true', () => {
          const result = checkIfAnyGlobMatchesAnyFile(
            changedFiles,
            globPatterns,
            false,
            true
          );
          expect(result).toBe(true);
        });
      });

      describe('checkIfAllGlobsMatchAnyFile', () => {
        it('returns false when `nocase` is false', () => {
          const result = checkIfAllGlobsMatchAnyFile(
            changedFiles,
            globPatterns,
            false,
            false
          );
          expect(result).toBe(false);
        });

        it('returns true when `nocase` is true', () => {
          const result = checkIfAllGlobsMatchAnyFile(
            changedFiles,
            globPatterns,
            false,
            true
          );
          expect(result).toBe(true);
        });
      });

      describe('checkIfAnyGlobMatchesAllFiles', () => {
        it('returns false when `nocase` is false', () => {
          const result = checkIfAnyGlobMatchesAllFiles(
            changedFiles,
            globPatterns,
            false,
            false
          );
          expect(result).toBe(false);
        });

        it('returns true when `nocase` is true', () => {
          const result = checkIfAnyGlobMatchesAllFiles(
            changedFiles,
            globPatterns,
            false,
            true
          );
          expect(result).toBe(true);
        });
      });

      describe('checkIfAllGlobsMatchAllFiles', () => {
        it('returns false when `nocase` is false', () => {
          const result = checkIfAllGlobsMatchAllFiles(
            changedFiles,
            globPatterns,
            false,
            false
          );
          expect(result).toBe(false);
        });

        it('returns true when `nocase` is true', () => {
          const result = checkIfAllGlobsMatchAllFiles(
            changedFiles,
            globPatterns,
            false,
            true
          );
          expect(result).toBe(true);
        });
      });
    }
  );

  describe('when passed through the "changed-files" config keys', () => {
    const changedFiles = [
      'src/MyComponent/Button.tsx',
      'src/MyComponent/Icon.tsx'
    ];
    const globPatterns = ['src/mycomponent/**'];

    // `checkAnyChangedFiles` short-circuits on the first matching key, so each
    // key gets its own config to cover every glob pattern branch.
    describe.each([
      'anyGlobToAnyFile',
      'anyGlobToAllFiles',
      'allGlobsToAnyFile',
      'allGlobsToAllFiles'
    ])('checkAnyChangedFiles with a "%s" config', key => {
      const globPatternsConfigs = [{[key]: globPatterns}];

      it('returns false when `nocase` is false', () => {
        const result = checkAnyChangedFiles(
          changedFiles,
          globPatternsConfigs,
          false,
          false
        );
        expect(result).toBe(false);
      });

      it('returns true when `nocase` is true', () => {
        const result = checkAnyChangedFiles(
          changedFiles,
          globPatternsConfigs,
          false,
          true
        );
        expect(result).toBe(true);
      });
    });

    // `checkAllChangedFiles` requires every key to match, so one config covering
    // all of them fails if any single branch ignores `nocase`.
    describe('checkAllChangedFiles', () => {
      const globPatternsConfigs = [
        {
          anyGlobToAnyFile: globPatterns,
          anyGlobToAllFiles: globPatterns,
          allGlobsToAnyFile: globPatterns,
          allGlobsToAllFiles: globPatterns
        }
      ];

      it('returns false when `nocase` is false', () => {
        const result = checkAllChangedFiles(
          changedFiles,
          globPatternsConfigs,
          false,
          false
        );
        expect(result).toBe(false);
      });

      it('returns true when `nocase` is true', () => {
        const result = checkAllChangedFiles(
          changedFiles,
          globPatternsConfigs,
          false,
          true
        );
        expect(result).toBe(true);
      });
    });
  });
});
