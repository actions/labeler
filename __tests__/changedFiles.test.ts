import * as github from '@actions/github';
import {
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

describe(toChangedFilesMatchConfig, () => {
  describe(`when there is no 'changed-files' key in the config`, () => {
    it.todo('returns an empty object');
  });

  describe(`when there is a 'changed-files' key in the config`, () => {
    describe(`and it contains a 'all' key`, () => {
      describe('with a value of a string', () => {
        it.todo(
          'sets the value to be an array of strings in the config object'
        );
      });

      describe('with a value of an array of strings', () => {
        it.todo('sets the value in the config object');
      });
    });

    describe(`and it contains a 'any' key`, () => {
      describe('with a value of a string', () => {
        it.todo(
          'sets the value to be an array of strings on the config object'
        );
      });

      describe('with a value of an array of strings', () => {
        it.todo('sets the value in the config object');
      });
    });

    describe('and the value is a string', () => {
      it.todo(`sets the string as an array under an 'any' key`);
    });

    describe('and the value is an array of strings', () => {
      it.todo(`sets the array under an 'any' key`);
    });
  });
});
