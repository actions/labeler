import {checkBranch} from '../src/branch';
import * as github from '@actions/github';

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('checkBranch', () => {
  describe('when a single pattern is provided', () => {
    beforeEach(() => {
      github.context.payload.pull_request!.head = {
        ref: 'test/feature/123'
      };
    });

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
    beforeEach(() => {
      github.context.payload.pull_request!.head = {
        ref: 'test/feature/123'
      };
    });

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
});
