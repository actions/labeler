import {
  getTitle,
  checkAnyTitle,
  checkAllTitle,
  toTitleMatchConfig,
  TitleMatchConfig
} from '../src/title';
import * as github from '@actions/github';

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('getTitle', () => {
  describe('when the pull requests title is requested', () => {
    it('returns the title', () => {
      const result = getTitle();
      expect(result).toEqual('pr-title');
    });
  });
});

describe('checkAllTitle', () => {
  beforeEach(() => {
    github.context.payload.pull_request!.title = 'type(scope): description';
  });

  describe('when a single pattern is provided', () => {
    describe('and the pattern matches the title', () => {
      it('returns true', () => {
        const result = checkAllTitle(['^type']);
        expect(result).toBe(true);
      });
    });

    describe('and the pattern does not match the title', () => {
      it('returns false', () => {
        const result = checkAllTitle(['^feature/']);
        expect(result).toBe(false);
      });
    });
  });

  describe('when multiple patterns are provided', () => {
    describe('and not all patterns matched', () => {
      it('returns false', () => {
        const result = checkAllTitle(['^type', '^test']);
        expect(result).toBe(false);
      });
    });

    describe('and all patterns match', () => {
      it('returns true', () => {
        const result = checkAllTitle(['^type', '^\\w+\\(scope\\):']);
        expect(result).toBe(true);
      });
    });

    describe('and no patterns match', () => {
      it('returns false', () => {
        const result = checkAllTitle(['^feature', 'test$']);
        expect(result).toBe(false);
      });
    });
  });
});

describe('checkAnyTitle', () => {
  beforeEach(() => {
    github.context.payload.pull_request!.title = 'type(scope): description';
  });

  describe('when a single pattern is provided', () => {
    describe('and the pattern matches the title', () => {
      it('returns true', () => {
        const result = checkAnyTitle(['^type']);
        expect(result).toBe(true);
      });
    });

    describe('and the pattern does not match the title', () => {
      it('returns false', () => {
        const result = checkAnyTitle(['^test']);
        expect(result).toBe(false);
      });
    });
  });

  describe('when multiple patterns are provided', () => {
    describe('and at least one pattern matches', () => {
      it('returns true', () => {
        const result = checkAnyTitle(['^type', '^test']);
        expect(result).toBe(true);
      });
    });

    describe('and all patterns match', () => {
      it('returns true', () => {
        const result = checkAnyTitle(['^type', '^\\w+\\(scope\\):']);
        expect(result).toBe(true);
      });
    });

    describe('and no patterns match', () => {
      it('returns false', () => {
        const result = checkAllTitle(['^feature', 'test$']);
        expect(result).toBe(false);
      });
    });
  });
});

describe('toTitleMatchConfig', () => {
  describe('when there are no title keys in the config', () => {
    const config = {'changed-files': [{any: ['testing']}]};

    it('returns an empty object', () => {
      const result = toTitleMatchConfig(config);
      expect(result).toEqual({});
    });
  });

  describe('when the config contains a title option', () => {
    const config = {title: ['testing']};

    it('sets title in the matchConfig', () => {
      const result = toTitleMatchConfig(config);
      expect(result).toEqual<TitleMatchConfig>({
        title: ['testing']
      });
    });

    describe('and the matching option is a string', () => {
      const stringConfig = {title: 'testing'};

      it('sets title in the matchConfig', () => {
        const result = toTitleMatchConfig(stringConfig);
        expect(result).toEqual<TitleMatchConfig>({
          title: ['testing']
        });
      });
    });
  });
});
