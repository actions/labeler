import {checkGlobs} from '../src/labeler';

import * as core from '@actions/core';

jest.mock('@actions/core');

beforeAll(() => {
  jest.spyOn(core, 'getInput').mockImplementation((name, options) => {
    return jest.requireActual('@actions/core').getInput(name, options);
  });
});

const matchConfig = [{any: ['*.txt']}];

describe('checkGlobs', () => {
  it('returns true when our pattern does match changed files', () => {
    const changedFiles = ['foo.txt', 'bar.txt'];
    const result = checkGlobs('', '', changedFiles, matchConfig, false);

    expect(result).toBeTruthy();
  });

  it('returns false when our pattern does not match changed files', () => {
    const changedFiles = ['foo.docx'];
    const result = checkGlobs('', '', changedFiles, matchConfig, false);

    expect(result).toBeFalsy();
  });

  it('returns false for a file starting with dot if `dot` option is false', () => {
    const changedFiles = ['.foo.txt'];
    const result = checkGlobs('', '', changedFiles, matchConfig, false);

    expect(result).toBeFalsy();
  });

  it('returns true for a file starting with dot if `dot` option is true', () => {
    const changedFiles = ['.foo.txt'];
    const result = checkGlobs('', '', changedFiles, matchConfig, true);

    expect(result).toBeTruthy();
  });

  describe('by body', () => {
    it('returns true when our pattern does match PR body', () => {
      const anyBodyWithFooConfig = [{any: ['body:baz']}];
      const changedFiles = ['foo.txt', 'bar.txt'];
      const result = checkGlobs(
        '',
        'blah baz potato',
        changedFiles,
        anyBodyWithFooConfig,
        false
      );

      expect(result).toBeTruthy();
    });

    it('returns false when our pattern does not match PR body', () => {
      const anyBodyWithBazConfig = [{any: ['body:bar']}];
      const changedFiles = ['foo.txt', 'bar.txt'];
      const result = checkGlobs(
        '',
        'blah bass potato',
        changedFiles,
        anyBodyWithBazConfig,
        false
      );

      expect(result).toBeFalsy();
    });
  });
  describe('by title', () => {
    it('returns true when our pattern does match PR title', () => {
      const anyBodyWithFooConfig = [{any: ['title:baz']}];
      const changedFiles = ['foo.txt', 'bar.txt'];
      const result = checkGlobs(
        'blah baz potato',
        '',
        changedFiles,
        anyBodyWithFooConfig,
        false
      );

      expect(result).toBeTruthy();
    });

    it('returns false when our pattern does not match PR title', () => {
      const anyBodyWithBazConfig = [{any: ['title:bar']}];
      const changedFiles = ['foo.txt', 'bar.txt'];
      const result = checkGlobs(
        'blah bass potato',
        '',
        changedFiles,
        anyBodyWithBazConfig,
        false
      );

      expect(result).toBeFalsy();
    });
  });

  describe('by body or title', () => {
    it('returns true when our pattern does not match PR body, but matches a file', () => {
      const anyBodyWithBazConfig = [{any: ['body:bar', 'bar.*']}];
      const changedFiles = ['foo.txt', 'bar.txt'];
      const result = checkGlobs(
        '',
        'blah bass potato',
        changedFiles,
        anyBodyWithBazConfig,
        false
      );

      expect(result).toBeTruthy();
    });

    it('returns true when our pattern does not match PR body but matches a title', () => {
      const anyBodyWithBazConfig = [{any: ['body:bar', 'title:zoo']}];
      const changedFiles = ['foo.txt', 'bar.txt'];
      const result = checkGlobs(
        'welcome to the zoo',
        'blah bass potato',
        changedFiles,
        anyBodyWithBazConfig,
        false
      );

      expect(result).toBeTruthy();
    });

    it('returns true when our pattern does not match PR body or title but matches a file', () => {
      const anyBodyWithBazConfig = [
        {any: ['body:bar', 'title:potato', 'bar.*']}
      ];
      const changedFiles = ['foo.txt', 'bar.txt'];
      const result = checkGlobs(
        'welcome to the zoo',
        'blah bass potato',
        changedFiles,
        anyBodyWithBazConfig,
        false
      );

      expect(result).toBeTruthy();
    });
  });

  describe('by body and title', () => {
    it('returns true when our pattern matches PR body and title', () => {
      const anyBodyWithBazConfig = [{all: ['body:bass', 'title:bar']}];
      const result = checkGlobs(
        'some bar here',
        'blah bass potato',
        [],
        anyBodyWithBazConfig,
        false
      );

      expect(result).toBeTruthy();
    });

    it('returns true when our pattern matches PR body, title and files', () => {
      const anyBodyWithBazConfig = [{all: ['body:bass', 'title:zoo', '*.txt']}];
      const changedFiles = ['foo.txt', 'bar.txt'];
      const result = checkGlobs(
        'welcome to the zoo.',
        'blah bass potato',
        changedFiles,
        anyBodyWithBazConfig,
        false
      );

      expect(result).toBeTruthy();
    });

    it('returns false when our pattern does not match PR body, even if it matches files', () => {
      const anyBodyWithBazConfig = [{all: ['body:not_here', '*.txt']}];
      const changedFiles = ['foo.txt', 'bar.txt'];
      const result = checkGlobs(
        'welcome to the zoo',
        'blah bass potato',
        changedFiles,
        anyBodyWithBazConfig,
        false
      );

      expect(result).toBeFalsy();
    });
  });
});
