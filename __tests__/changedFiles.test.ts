import {
  ChangedFilesMatchConfig,
  checkAllChangedFiles,
  checkAnyChangedFiles,
  toChangedFilesMatchConfig
} from '../src/changedFiles';
import {PrFileType} from '../src/labeler';

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('checkAllChangedFiles', () => {
  const changedFiles: PrFileType[] = [
    {name: 'foo.txt', size: 6},
    {name: 'bar.txt', size: 20}
  ];

  describe('when the globs match every file that has been changed', () => {
    const globs = ['*.txt'];

    it('returns true', () => {
      const result = checkAllChangedFiles(changedFiles, globs);
      expect(result).toBe(true);
    });
  });

  describe(`when the globs don't match every file that has changed`, () => {
    const globs = ['foo.txt'];

    it('returns false', () => {
      const result = checkAllChangedFiles(changedFiles, globs);
      expect(result).toBe(false);
    });
  });
});

describe('checkAnyChangedFiles', () => {
  const changedFiles: PrFileType[] = [
    {name: 'foo.txt', size: 6},
    {name: 'bar.txt', size: 20}
  ];

  describe('when any glob matches any of the files that have changed', () => {
    const globs = ['*.txt', '*.md'];

    it('returns true', () => {
      const result = checkAnyChangedFiles(changedFiles, globs);
      expect(result).toBe(true);
    });
  });

  describe('when none of the globs match any files that have changed', () => {
    const globs = ['*.md'];

    it('returns false', () => {
      const result = checkAnyChangedFiles(changedFiles, globs);
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
    describe('and the value is an array of strings', () => {
      const config = {'changed-files': ['testing']};

      it('sets the value in the config object', () => {
        const result = toChangedFilesMatchConfig(config);
        expect(result).toEqual<ChangedFilesMatchConfig>({
          changedFiles: ['testing']
        });
      });
    });

    describe('and the value is a string', () => {
      const config = {'changed-files': 'testing'};

      it(`sets the string as an array in the config object`, () => {
        const result = toChangedFilesMatchConfig(config);
        expect(result).toEqual<ChangedFilesMatchConfig>({
          changedFiles: ['testing']
        });
      });
    });

    describe('but the value is an empty string', () => {
      const config = {'changed-files': ''};

      it(`returns an empty object`, () => {
        const result = toChangedFilesMatchConfig(config);
        expect(result).toEqual<ChangedFilesMatchConfig>({});
      });
    });

    describe('but the value is an empty array', () => {
      const config = {'changed-files': []};

      it(`returns an empty object`, () => {
        const result = toChangedFilesMatchConfig(config);
        expect(result).toEqual<ChangedFilesMatchConfig>({});
      });
    });
  });
});
