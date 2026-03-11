import * as github from '@actions/github';
import {ClientType} from './types';
import {MatchConfig} from './get-label-configs';

export const setLabels = async (
  client: ClientType,
  prNumber: number,
  labels: string[]
) => {
  await client.rest.issues.setLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels: labels
  });
};

export type LabelConfigs = Map<string, MatchConfig[]>;

type RepoLabel = {
  name: string;
  color?: string | null;
  description?: string | null;
};

export type RepoLabelCache = Map<string, RepoLabel>;

// Function to update a list of labels
export const updateLabels = async (
  client: ClientType,
  labels: string[],
  labelConfigs: LabelConfigs,
  repoLabelCache: RepoLabelCache
) => {
  const labelMetaEntries = labels
    .map(label => ({
      label,
      meta: labelConfigs.get(label)?.find(config => config.meta)?.meta
    }))
    .filter(
      entry => entry.meta && (entry.meta.color || entry.meta.description)
    );

  if (!labelMetaEntries.length) {
    return;
  }

  if (repoLabelCache.size === 0) {
    const listLabelsOptions =
      client.rest.issues.listLabelsForRepo.endpoint.merge({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo
      });
    const repoLabels = (await client.paginate(
      listLabelsOptions
    )) as RepoLabel[];
    for (const repoLabel of repoLabels) {
      if (typeof repoLabel.name !== 'string') {
        continue;
      }
      repoLabelCache.set(repoLabel.name, {
        name: repoLabel.name,
        color: repoLabel.color ?? undefined,
        description: repoLabel.description ?? undefined
      });
    }
  }

  for (const {label, meta: metadata} of labelMetaEntries) {
    if (!metadata) {
      continue;
    }

    const colorConfig = metadata.color;
    const descriptionConfig = metadata.description;
    const existingLabel = repoLabelCache.get(label);

    if (!existingLabel) {
      const createParams: Parameters<typeof client.rest.issues.createLabel>[0] =
        {
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          name: label
        };
      if (colorConfig) {
        createParams.color = colorConfig;
      }
      if (descriptionConfig) {
        createParams.description = descriptionConfig;
      }
      await client.rest.issues.createLabel(createParams);
      repoLabelCache.set(label, {
        name: label,
        color: colorConfig ?? undefined,
        description: descriptionConfig ?? undefined
      });
      continue;
    }

    const existingColor = existingLabel.color?.toLowerCase();
    const desiredColor = colorConfig?.toLowerCase();
    const colorMatches = desiredColor ? desiredColor === existingColor : true;
    const descriptionMatches = descriptionConfig
      ? descriptionConfig === (existingLabel.description ?? undefined)
      : true;

    if (colorMatches && descriptionMatches) {
      continue;
    }

    const updateParams: Parameters<typeof client.rest.issues.updateLabel>[0] = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      name: label
    };
    if (colorConfig) {
      updateParams.color = colorConfig;
    }
    if (descriptionConfig) {
      updateParams.description = descriptionConfig;
    }
    await client.rest.issues.updateLabel(updateParams);
    repoLabelCache.set(label, {
      name: label,
      color: colorConfig ?? existingLabel.color ?? undefined,
      description: descriptionConfig ?? existingLabel.description ?? undefined
    });
  }
};
