import * as github from '@actions/github';
import {
  ChangedFilesMatchConfig,
  checkAll,
  checkAny,
  toChangedFilesMatchConfig
} from '../src/changedFiles';

jest.mock('@actions/core');
jest.mock('@actions/github');

describe(checkAll, () => {
  describe('when all the patterns match', () => {
    it.todo('returns true');
  });

  describe('when no the patterns match', () => {
    it.todo('returns false');
  });
});

describe(checkAny, () => {
  describe('when any provided patterns matches one of the files changed', () => {
    it.todo('returns true');
  });

  describe('when no the patterns match', () => {
    it.todo('returns false');
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
