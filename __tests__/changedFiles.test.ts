import {
  ChangedFilesMatchConfig,
  checkAll,
  checkAny,
  toChangedFilesMatchConfig
} from '../src/changedFiles';

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('checkAll', () => {
  const changedFiles = ['foo.txt', 'bar.txt'];

  describe('when the globs match every file that has changed', () => {
    const globs = ['*.txt'];

    it('returns true', () => {
      const result = checkAll(changedFiles, globs);
      expect(result).toBe(true);
    });
  });

  describe(`when the globs don't match every file that has changed`, () => {
    const globs = ['foo.txt'];

    it('returns false', () => {
      const result = checkAll(changedFiles, globs);
      expect(result).toBe(false);
    });
  });
});

describe('checkAny', () => {
  const changedFiles = ['foo.txt', 'bar.txt'];

  describe('when the globs match any of the files that have changed', () => {
    const globs = ['foo.txt'];

    it('returns true', () => {
      const result = checkAny(changedFiles, globs);
      expect(result).toBe(true);
    });
  });

  describe('when none of the globs match any files that have changed', () => {
    const globs = ['*.md'];

    it('returns false', () => {
      const result = checkAny(changedFiles, globs);
      expect(result).toBe(false);
    });
  });
});

describe('toChangedFilesMatchConfig', () => {
  describe(`when there is no 'changed-files' key in the config`, () => {
    const config = {'head-branch': 'test'};

    it('returns an empty object', () => {
      const result = toChangedFilesMatchConfig(config);
      expect(result).toMatchObject<ChangedFilesMatchConfig>({});
    });
  });

  describe(`when both 'any' and 'all' keys are present`, () => {
    const config = {'changed-files': [{all: 'testing'}, {any: 'testing'}]};

    it('sets both values in the config object', () => {
      const result = toChangedFilesMatchConfig(config);
      expect(result).toMatchObject<ChangedFilesMatchConfig>({
        changedFiles: {
          any: ['testing'],
          all: ['testing']
        }
      });
    });
  });

  describe(`when there is a 'changed-files' key in the config`, () => {
    describe(`and it contains a 'all' key`, () => {
      describe('with a value of a string', () => {
        const config = {'changed-files': [{all: 'testing'}]};

        it('sets the value to be an array of strings in the config object', () => {
          const result = toChangedFilesMatchConfig(config);
          expect(result).toMatchObject<ChangedFilesMatchConfig>({
            changedFiles: {
              all: ['testing']
            }
          });
        });
      });

      describe('with a value of an array of strings', () => {
        const config = {'changed-files': [{all: ['testing']}]};

        it('sets the value in the config object', () => {
          const result = toChangedFilesMatchConfig(config);
          expect(result).toMatchObject<ChangedFilesMatchConfig>({
            changedFiles: {
              all: ['testing']
            }
          });
        });
      });
    });

    describe(`and it contains a 'any' key`, () => {
      describe('with a value of a string', () => {
        const config = {'changed-files': [{any: 'testing'}]};

        it('sets the value to be an array of strings on the config object', () => {
          const result = toChangedFilesMatchConfig(config);
          expect(result).toMatchObject<ChangedFilesMatchConfig>({
            changedFiles: {
              any: ['testing']
            }
          });
        });
      });

      describe('with a value of an array of strings', () => {
        const config = {'changed-files': [{any: ['testing']}]};

        it('sets the value in the config object', () => {
          const result = toChangedFilesMatchConfig(config);
          expect(result).toMatchObject<ChangedFilesMatchConfig>({
            changedFiles: {
              any: ['testing']
            }
          });
        });
      });
    });

    describe('and the value is a string', () => {
      const config = {'changed-files': 'testing'};

      it(`sets the string as an array under an 'any' key`, () => {
        const result = toChangedFilesMatchConfig(config);
        expect(result).toMatchObject<ChangedFilesMatchConfig>({
          changedFiles: {
            any: ['testing']
          }
        });
      });
    });

    describe('and the value is an array of strings', () => {
      const config = {'changed-files': ['testing']};

      it(`sets the array under an 'any' key`, () => {
        const result = toChangedFilesMatchConfig(config);
        expect(result).toMatchObject<ChangedFilesMatchConfig>({
          changedFiles: {
            any: ['testing']
          }
        });
      });
    });
  });
});
