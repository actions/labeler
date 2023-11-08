import {
  ChangedFilesMatchConfig,
  checkAllChangedFiles,
  checkAnyChangedFiles,
  toChangedFilesMatchConfig,
  checkIfAnyGlobMatchesAnyFile,
  checkIfAllGlobsMatchAnyFile,
  checkIfAnyGlobMatchesAllFiles,
  checkIfAllGlobsMatchAllFiles
} from '../src/changedFiles';

jest.mock('@actions/core');
jest.mock('@actions/github');

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
      expect(result).toEqual<ChangedFilesMatchConfig>({});
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
          expect(result).toEqual<ChangedFilesMatchConfig>({
            changedFiles: [{anyGlobToAnyFile: ['testing']}]
          });
        });
      });

      describe('and the value is a string', () => {
        const config = {'changed-files': [{'any-glob-to-any-file': 'testing'}]};

        it(`sets the string as an array in the config object`, () => {
          const result = toChangedFilesMatchConfig(config);
          expect(result).toEqual<ChangedFilesMatchConfig>({
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
        false
      );
      expect(result).toBe(false);
    });
  });
});
