import * as core from '@actions/core';
import * as yaml from 'js-yaml';
import fs from 'fs';
import {ClientType} from './types';
import {getContent} from './get-content';

export interface MatchConfig {
  all?: string[];
  any?: string[];
}

export type StringOrMatchConfig = string | MatchConfig;

export const getLabelGlobs = (
  client: ClientType,
  configurationPath: string
): Promise<Map<string, StringOrMatchConfig[]>> =>
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
      // loads (hopefully) a `{[label:string]: string | StringOrMatchConfig[]}`, but is `any`:
      const configObject: any = yaml.load(configuration);

      // transform `any` => `Map<string,StringOrMatchConfig[]>` or throw if yaml is malformed:
      return getLabelGlobMapFromObject(configObject);
    });

function getLabelGlobMapFromObject(
  configObject: any
): Map<string, StringOrMatchConfig[]> {
  const labelGlobs: Map<string, StringOrMatchConfig[]> = new Map();

  for (const label in configObject) {
    if (typeof configObject[label] === 'string') {
      labelGlobs.set(label, [configObject[label]]);
    } else if (configObject[label] instanceof Array) {
      labelGlobs.set(label, configObject[label]);
    } else {
      throw Error(
        `found unexpected type for label ${label} (should be string or array of globs)`
      );
    }
  }

  return labelGlobs;
}
