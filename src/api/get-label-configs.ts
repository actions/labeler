import * as core from '@actions/core';
import * as yaml from 'js-yaml';
import fs from 'fs';
import {ClientType} from './types';
import {getContent} from './get-content';

import {
  ChangedFilesMatchConfig,
  toChangedFilesMatchConfig
} from '../changedFiles';

import {toBranchMatchConfig, BranchMatchConfig} from '../branch';

export interface MatchConfig {
  all?: BaseMatchConfig[];
  any?: BaseMatchConfig[];
}

export type BaseMatchConfig = BranchMatchConfig & ChangedFilesMatchConfig;

const ALLOWED_CONFIG_KEYS = ['changed-files', 'head-branch', 'base-branch'];

export const getLabelConfigs = (
  client: ClientType,
  configurationPath: string
): Promise<Map<string, MatchConfig[]>> =>
  Promise.resolve()
    .then(() => {
      if (!fs.existsSync(configurationPath)) {
        core.info(
          `The configuration file (path: ${configurationPath}) was not found locally, fetching via the api`
        );

        return getContent(client, configurationPath);
      }

      core.info(
        `The configuration file (path: ${configurationPath}) was found locally, reading from the file`
      );

      return fs.readFileSync(configurationPath, {
        encoding: 'utf8'
      });
    })
    .catch(error => {
      if (error.name == 'HttpError' || error.name == 'NotFound') {
        core.warning(
          `The config file was not found at ${configurationPath}. Make sure it exists and that this action has the correct access rights.`
        );
      }
      return Promise.reject(error);
    })
    .then(configuration => {
      // loads (hopefully) a `{[label:string]: MatchConfig[]}`, but is `any`:
      const configObject: any = yaml.load(configuration);

      // transform `any` => `Map<string,MatchConfig[]>` or throw if yaml is malformed:
      return getLabelConfigMapFromObject(configObject);
    });

export function getLabelConfigMapFromObject(
  configObject: any
): Map<string, MatchConfig[]> {
  const labelMap: Map<string, MatchConfig[]> = new Map();
  for (const label in configObject) {
    const configOptions = configObject[label];
    if (
      !Array.isArray(configOptions) ||
      !configOptions.every(opts => typeof opts === 'object')
    ) {
      throw Error(
        `found unexpected type for label '${label}' (should be array of config options)`
      );
    }
    const matchConfigs = configOptions.reduce<MatchConfig[]>(
      (updatedConfig, configValue) => {
        if (!configValue) {
          return updatedConfig;
        }

        Object.entries(configValue).forEach(([key, value]) => {
          // If the top level `any` or `all` keys are provided then set them, and convert their values to
          // our config objects.
          if (key === 'any' || key === 'all') {
            if (Array.isArray(value)) {
              const newConfigs = value.map(toMatchConfig);
              updatedConfig.push({[key]: newConfigs});
            }
          } else if (ALLOWED_CONFIG_KEYS.includes(key)) {
            const newMatchConfig = toMatchConfig({[key]: value});
            // Find or set the `any` key so that we can add these properties to that rule,
            // Or create a new `any` key and add that to our array of configs.
            const indexOfAny = updatedConfig.findIndex(mc => !!mc['any']);
            if (indexOfAny >= 0) {
              updatedConfig[indexOfAny].any?.push(newMatchConfig);
            } else {
              updatedConfig.push({any: [newMatchConfig]});
            }
          } else {
            // Log the key that we don't know what to do with.
            core.info(`An unknown config option was under ${label}: ${key}`);
          }
        });

        return updatedConfig;
      },
      []
    );

    if (matchConfigs.length) {
      labelMap.set(label, matchConfigs);
    }
  }

  return labelMap;
}

export function toMatchConfig(config: any): BaseMatchConfig {
  const changedFilesConfig = toChangedFilesMatchConfig(config);
  const branchConfig = toBranchMatchConfig(config);

  return {
    ...changedFilesConfig,
    ...branchConfig
  };
}
