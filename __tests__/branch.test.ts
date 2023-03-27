import {
  getBranchName,
  checkAnyBranch,
  checkAllBranch,
  toBranchMatchConfig,
  BranchMatchConfig
} from '../src/branch';
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
});

describe('checkAllBranch', () => {
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
        const result = checkAllBranch(['^test'], 'head');
        expect(result).toBe(true);
      });
    });

    describe('and the pattern does not match the head branch', () => {
      it('returns false', () => {
        const result = checkAllBranch(['^feature/'], 'head');
        expect(result).toBe(false);
      });
    });
  });

  describe('when multiple patterns are provided', () => {
    describe('and not all patterns matched', () => {
      it('returns false', () => {
        const result = checkAllBranch(['^test/', '^feature/'], 'head');
        expect(result).toBe(false);
      });
    });

    describe('and all patterns match', () => {
      it('returns true', () => {
        const result = checkAllBranch(['^test/', '/feature/'], 'head');
        expect(result).toBe(true);
      });
    });

    describe('and no patterns match', () => {
      it('returns false', () => {
        const result = checkAllBranch(['^feature/', '/test$'], 'head');
        expect(result).toBe(false);
      });
    });
  });

  describe('when the branch to check is specified as the base branch', () => {
    describe('and the pattern matches the base branch', () => {
      it('returns true', () => {
        const result = checkAllBranch(['^main$'], 'base');
        expect(result).toBe(true);
      });
    });
  });
});

describe('checkAnyBranch', () => {
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
        const result = checkAnyBranch(['^test'], 'head');
        expect(result).toBe(true);
      });
    });

    describe('and the pattern does not match the head branch', () => {
      it('returns false', () => {
        const result = checkAnyBranch(['^feature/'], 'head');
        expect(result).toBe(false);
      });
    });
  });

  describe('when multiple patterns are provided', () => {
    describe('and at least one pattern matches', () => {
      it('returns true', () => {
        const result = checkAnyBranch(['^test/', '^feature/'], 'head');
        expect(result).toBe(true);
      });
    });

    describe('and all patterns match', () => {
      it('returns true', () => {
        const result = checkAnyBranch(['^test/', '/feature/'], 'head');
        expect(result).toBe(true);
      });
    });

    describe('and no patterns match', () => {
      it('returns false', () => {
        const result = checkAnyBranch(['^feature/', '/test$'], 'head');
        expect(result).toBe(false);
      });
    });
  });

  describe('when the branch to check is specified as the base branch', () => {
    describe('and the pattern matches the base branch', () => {
      it('returns true', () => {
        const result = checkAnyBranch(['^main$'], 'base');
        expect(result).toBe(true);
      });
    });
  });
});

describe('toBranchMatchConfig', () => {
  describe('when there are no branch keys in the config', () => {
    const config = {'changed-files': [{any: ['testing']}]};

    it('returns an empty object', () => {
      const result = toBranchMatchConfig(config);
      expect(result).toEqual({});
    });
  });

  describe('when the config contains a head-branch option', () => {
    const config = {'head-branch': ['testing']};

    it('sets headBranch in the matchConfig', () => {
      const result = toBranchMatchConfig(config);
      expect(result).toEqual<BranchMatchConfig>({
        headBranch: ['testing']
      });
    });

    describe('and the matching option is a string', () => {
      const stringConfig = {'head-branch': 'testing'};

      it('sets headBranch in the matchConfig', () => {
        const result = toBranchMatchConfig(stringConfig);
        expect(result).toEqual<BranchMatchConfig>({
          headBranch: ['testing']
        });
      });
    });
  });

  describe('when the config contains a base-branch option', () => {
    const config = {'base-branch': ['testing']};
    it('sets baseBranch in the matchConfig', () => {
      const result = toBranchMatchConfig(config);
      expect(result).toEqual<BranchMatchConfig>({
        baseBranch: ['testing']
      });
    });

    describe('and the matching option is a string', () => {
      const stringConfig = {'base-branch': 'testing'};

      it('sets baseBranch in the matchConfig', () => {
        const result = toBranchMatchConfig(stringConfig);
        expect(result).toEqual<BranchMatchConfig>({
          baseBranch: ['testing']
        });
      });
    });
  });

  describe('when the config contains both a base-branch and head-branch option', () => {
    const config = {'base-branch': ['testing'], 'head-branch': ['testing']};
    it('sets headBranch and baseBranch in the matchConfig', () => {
      const result = toBranchMatchConfig(config);
      expect(result).toEqual<BranchMatchConfig>({
        baseBranch: ['testing'],
        headBranch: ['testing']
      });
    });
  });
});
