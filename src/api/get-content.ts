import * as github from '@actions/github';
import {ClientType} from './types';

export const getContent = async (
  client: ClientType,
  repoPath: string
): Promise<string> => {
  const response: any = await client.rest.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: repoPath,
    ref: github.context.sha
  });

  return Buffer.from(response.data.content, response.data.encoding).toString();
};
