import * as github from '@actions/github';
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods/dist-types';

export type ClientType = ReturnType<typeof github.getOctokit>;

export type PullRequest =
  RestEndpointMethodTypes['pulls']['get']['response']['data'];
