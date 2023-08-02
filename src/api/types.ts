import * as github from '@actions/github';
export type ClientType = ReturnType<typeof github.getOctokit>;
