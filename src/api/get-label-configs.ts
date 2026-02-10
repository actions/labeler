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

export interface LabelConfigResult {
  labelConfigs: Map<string, MatchConfig[]>;
  changedFilesLimit?: number;
}

const ALLOWED_CONFIG_KEYS = ['changed-files', 'head-branch', 'base-branch'];
const TOP_LEVEL_OPTIONS = ['changed-files-labels-limit'];

/**
 * Parses and validates a limit value from the configuration.
 * Accepts only non-negative integers.
 */
function parseChangedFilesLabelsLimit(value: unknown): number {
  let parsed: number;

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(
        `Invalid value for 'changed-files-labels-limit': must be a non-negative integer (got ${value})`
      );
    }
    parsed = value;
  } else if (typeof value === 'string') {
    // Require string to be only digits
    if (!/^\d+$/.test(value)) {
      throw new Error(
        `Invalid value for 'changed-files-labels-limit': must be a non-negative integer (got '${value}')`
      );
    }
    parsed = parseInt(value, 10);
  } else {
    throw new Error(
      `Invalid value for 'changed-files-labels-limit': expected a non-negative integer`
    );
  }

  if (parsed < 0) {
    throw new Error(
      `Invalid value for 'changed-files-labels-limit': must be a non-negative integer (got ${parsed})`
    );
  }

  return parsed;
}

export const getLabelConfigs = (
  client: ClientType,
  configurationPath: string
): Promise<LabelConfigResult> =>
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

      // transform `any` => `LabelConfigResult` or throw if yaml is malformed:
      return getLabelConfigResultFromObject(configObject);
    });

export function getLabelConfigResultFromObject(
  configObject: any
): LabelConfigResult {
  // Extract top-level options
  let changedFilesLimit: number | undefined;

  const limitValue = configObject?.['changed-files-labels-limit'];
  if (limitValue !== undefined) {
    changedFilesLimit = parseChangedFilesLabelsLimit(limitValue);
  }

  return {
    labelConfigs: getLabelConfigMapFromObject(configObject),
    changedFilesLimit
  };
}

export function getLabelConfigMapFromObject(
  configObject: any
): Map<string, MatchConfig[]> {
  const labelMap: Map<string, MatchConfig[]> = new Map();
  for (const label in configObject) {
    // Skip top-level options
    if (TOP_LEVEL_OPTIONS.includes(label)) {
      continue;
    }
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

/**
 * Checks if any of the match configs for a label use changed-files patterns.
 * This is used to determine if a label should be counted toward the changed-files limit.
 */
export function configUsesChangedFiles(matchConfigs: MatchConfig[]): boolean {
  for (const config of matchConfigs) {
    if (config.all) {
      for (const baseConfig of config.all) {
        if (
          baseConfig.changedFiles &&
          baseConfig.changedFiles.some(cf => Object.keys(cf).length > 0)
        ) {
          return true;
        }
      }
    }
    if (config.any) {
      for (const baseConfig of config.any) {
        if (
          baseConfig.changedFiles &&
          baseConfig.changedFiles.some(cf => Object.keys(cf).length > 0)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}
