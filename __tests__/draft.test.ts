import {jest, describe, beforeEach, it, expect} from '@jest/globals';

jest.unstable_mockModule('@actions/core', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
}));

const mockGithubContext = {
  payload: {
    pull_request: {
      number: 123,
      draft: false,
      head: {ref: 'head-branch-name'},
      base: {ref: 'base-branch-name'}
    }
  },
  repo: {owner: 'monalisa', repo: 'helloworld'}
} as any;

jest.unstable_mockModule('@actions/github', () => ({
  context: mockGithubContext,
  getOctokit: jest.fn()
}));

const {getDraft, checkDraft, toDraftMatchConfig} =
  await import('../src/draft.js');

describe('getDraft', () => {
  it('returns the draft status from the pull request payload', () => {
    mockGithubContext.payload.pull_request.draft = true;
    expect(getDraft()).toBe(true);

    mockGithubContext.payload.pull_request.draft = false;
    expect(getDraft()).toBe(false);
  });

  it('returns undefined when there is no pull request payload', () => {
    mockGithubContext.payload.pull_request = undefined;
    expect(getDraft()).toBeUndefined();
  });
});

describe('checkDraft', () => {
  beforeEach(() => {
    mockGithubContext.payload.pull_request = {
      number: 123,
      draft: false
    };
  });

  describe('when the expected value is true', () => {
    it('returns true for a draft pull request', () => {
      mockGithubContext.payload.pull_request.draft = true;
      expect(checkDraft(true)).toBe(true);
    });

    it('returns false for a non-draft pull request', () => {
      mockGithubContext.payload.pull_request.draft = false;
      expect(checkDraft(true)).toBe(false);
    });
  });

  describe('when the expected value is false', () => {
    it('returns true for a non-draft pull request', () => {
      mockGithubContext.payload.pull_request.draft = false;
      expect(checkDraft(false)).toBe(true);
    });

    it('returns false for a draft pull request', () => {
      mockGithubContext.payload.pull_request.draft = true;
      expect(checkDraft(false)).toBe(false);
    });
  });

  describe('when an explicit draft status is provided', () => {
    it('uses the provided status instead of the payload', () => {
      mockGithubContext.payload.pull_request.draft = false;
      expect(checkDraft(true, true)).toBe(true);
      expect(checkDraft(false, true)).toBe(false);
    });
  });

  describe('when the draft status cannot be determined', () => {
    it('returns false', () => {
      mockGithubContext.payload.pull_request = undefined;
      expect(checkDraft(true)).toBe(false);
      expect(checkDraft(false)).toBe(false);
    });
  });
});

describe('toDraftMatchConfig', () => {
  describe('when there is no draft key in the config', () => {
    it('returns an empty object', () => {
      const result = toDraftMatchConfig({
        'changed-files': [{any: ['testing']}]
      });
      expect(result).toEqual({});
    });
  });

  describe('when the config contains a draft option', () => {
    it('sets draft to true', () => {
      expect(toDraftMatchConfig({draft: true})).toEqual({draft: true});
    });

    it('sets draft to false', () => {
      expect(toDraftMatchConfig({draft: false})).toEqual({draft: false});
    });
  });

  describe('when the draft option is not a boolean', () => {
    it('throws an error', () => {
      expect(() => toDraftMatchConfig({draft: 'true'})).toThrow(
        /The "draft" option must be a boolean/
      );
    });
  });
});
