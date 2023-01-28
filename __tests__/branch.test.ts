import {getBranchName, checkBranch} from '../src/branch';
import * as github from '@actions/github';

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('getBranchName', () => {
  describe('when the pull requests base branch is requested', () => {
    it('returns the base branch name', () => {
      const result = getBranchName('base');
      expect(result).toEqual('base-branch-name');
    });
  });

  describe('when the pull requests head branch is requested', () => {
    it('returns the head branch name', () => {
      const result = getBranchName('head');
      expect(result).toEqual('head-branch-name');
    });
  });

  describe('when no branch is specified', () => {
    it('returns the head branch name', () => {
      const result = getBranchName('base');
      expect(result).toEqual('base-branch-name');
    });
  });
});

describe('checkBranch', () => {
  beforeEach(() => {
    github.context.payload.pull_request!.head = {
      ref: 'test/feature/123'
    };
    github.context.payload.pull_request!.base = {
      ref: 'main'
    };
  });

  describe('when a single pattern is provided', () => {
    describe('and the pattern matches the head branch', () => {
      it('returns true', () => {
        const result = checkBranch(['^test']);
        expect(result).toBe(true);
      });
    });

    describe('and the pattern does not match the head branch', () => {
      it('returns false', () => {
        const result = checkBranch(['^feature/']);
        expect(result).toBe(false);
      });
    });
  });

  describe('when multiple patterns are provided', () => {
    describe('and at least one pattern matches', () => {
      it('returns true', () => {
        const result = checkBranch(['^test/', '^feature/']);
        expect(result).toBe(true);
      });
    });

    describe('and all patterns match', () => {
      it('returns true', () => {
        const result = checkBranch(['^test/', '/feature/']);
        expect(result).toBe(true);
      });
    });

    describe('and no patterns match', () => {
      it('returns false', () => {
        const result = checkBranch(['^feature/', '/test$']);
        expect(result).toBe(false);
      });
    });
  });

  describe('when the branch to check is specified as the base branch', () => {
    describe('and the pattern matches the base branch', () => {
      it('returns true', () => {
        const result = checkBranch(['^main$'], 'base');
        expect(result).toBe(true);
      });
    });
  });
});
