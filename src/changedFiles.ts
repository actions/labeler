import * as core from '@actions/core';
import * as github from '@actions/github';
import {Minimatch} from 'minimatch';
import {printPattern, isObject, kebabToCamel} from './utils';

export interface ChangedFilesMatchConfig {
  changedFiles?: ChangedFilesGlobPatternsConfig[];
}

interface ChangedFilesGlobPatternsConfig {
  anyGlobToAnyFile?: string[];
  anyGlobToAllFiles?: string[];
  allGlobsToAnyFile?: string[];
  allGlobsToAllFiles?: string[];
}

type ClientType = ReturnType<typeof github.getOctokit>;

const ALLOWED_FILES_CONFIG_KEYS = [
  'any-glob-to-any-file',
  'any-glob-to-all-files',
  'all-globs-to-any-file',
  'all-globs-to-all-files'
];

export async function getChangedFiles(
  client: ClientType,
  prNumber: number
): Promise<string[]> {
  const listFilesOptions = client.rest.pulls.listFiles.endpoint.merge({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNumber
  });

  const listFilesResponse = await client.paginate(listFilesOptions);
  const changedFiles = listFilesResponse.map((f: any) => f.filename);

  core.debug('found changed files:');
  for (const file of changedFiles) {
    core.debug('  ' + file);
  }

  return changedFiles;
}

export function toChangedFilesMatchConfig(
  config: any
): ChangedFilesMatchConfig {
  if (!config['changed-files'] || !config['changed-files'].length) {
    return {};
  }
  const changedFilesConfigs = Array.isArray(config['changed-files'])
    ? config['changed-files']
    : [config['changed-files']];

  const validChangedFilesConfigs: ChangedFilesGlobPatternsConfig[] = [];

  changedFilesConfigs.forEach(changedFilesConfig => {
    if (!isObject(changedFilesConfig)) {
      throw new Error(
        `The "changed-files" section must have a valid config structure. Please read the action documentation for more information`
      );
    }

    const changedFilesConfigKeys = Object.keys(changedFilesConfig);
    const invalidKeys = changedFilesConfigKeys.filter(
      key => !ALLOWED_FILES_CONFIG_KEYS.includes(key)
    );

    if (invalidKeys.length) {
      throw new Error(
        `Unknown config options were under "changed-files": ${invalidKeys.join(
          ', '
        )}`
      );
    }

    changedFilesConfigKeys.forEach(key => {
      validChangedFilesConfigs.push({
        [kebabToCamel(key)]: Array.isArray(changedFilesConfig[key])
          ? changedFilesConfig[key]
          : [changedFilesConfig[key]]
      });
    });
  });

  return {
    changedFiles: validChangedFilesConfigs
  };
}

export function checkAnyChangedFiles(
  changedFiles: string[],
  globPatternsConfigs: ChangedFilesGlobPatternsConfig[],
  dot: boolean
): boolean {
  core.debug(`   checking "changed-files" patterns`);

  for (const globPatternsConfig of globPatternsConfigs) {
    if (globPatternsConfig.anyGlobToAnyFile) {
      if (
        checkIfAnyGlobMatchesAnyFile(
          changedFiles,
          globPatternsConfig.anyGlobToAnyFile,
          dot
        )
      ) {
        core.debug(`   "changed-files" matched`);
        return true;
      }
    }

    if (globPatternsConfig.anyGlobToAllFiles) {
      if (
        checkIfAnyGlobMatchesAllFiles(
          changedFiles,
          globPatternsConfig.anyGlobToAllFiles,
          dot
        )
      ) {
        core.debug(`   "changed-files" matched`);
        return true;
      }
    }

    if (globPatternsConfig.allGlobsToAnyFile) {
      if (
        checkIfAllGlobsMatchAnyFile(
          changedFiles,
          globPatternsConfig.allGlobsToAnyFile,
          dot
        )
      ) {
        core.debug(`   "changed-files" matched`);
        return true;
      }
    }

    if (globPatternsConfig.allGlobsToAllFiles) {
      if (
        checkIfAllGlobsMatchAllFiles(
          changedFiles,
          globPatternsConfig.allGlobsToAllFiles,
          dot
        )
      ) {
        core.debug(`   "changed-files" matched`);
        return true;
      }
    }
  }

  core.debug(`   "changed-files" did not match`);
  return false;
}

export function checkAllChangedFiles(
  changedFiles: string[],
  globPatternsConfigs: ChangedFilesGlobPatternsConfig[],
  dot: boolean
): boolean {
  core.debug(`   checking "changed-files" patterns`);

  for (const globPatternsConfig of globPatternsConfigs) {
    if (globPatternsConfig.anyGlobToAnyFile) {
      if (
        !checkIfAnyGlobMatchesAnyFile(
          changedFiles,
          globPatternsConfig.anyGlobToAnyFile,
          dot
        )
      ) {
        core.debug(`   "changed-files" did not match`);
        return false;
      }
    }

    if (globPatternsConfig.anyGlobToAllFiles) {
      if (
        !checkIfAnyGlobMatchesAllFiles(
          changedFiles,
          globPatternsConfig.anyGlobToAllFiles,
          dot
        )
      ) {
        core.debug(`   "changed-files" did not match`);
        return false;
      }
    }

    if (globPatternsConfig.allGlobsToAnyFile) {
      if (
        !checkIfAllGlobsMatchAnyFile(
          changedFiles,
          globPatternsConfig.allGlobsToAnyFile,
          dot
        )
      ) {
        core.debug(`   "changed-files" did not match`);
        return false;
      }
    }

    if (globPatternsConfig.allGlobsToAllFiles) {
      if (
        !checkIfAllGlobsMatchAllFiles(
          changedFiles,
          globPatternsConfig.allGlobsToAllFiles,
          dot
        )
      ) {
        core.debug(`   "changed-files" did not match`);
        return false;
      }
    }
  }

  core.debug(`   "changed-files" patterns matched`);
  return true;
}

export function checkIfAnyGlobMatchesAnyFile(
  changedFiles: string[],
  globs: string[],
  dot: boolean
): boolean {
  core.debug(`    checking "any-glob-to-any-file" config patterns`);
  const matchers = globs.map(g => new Minimatch(g, {dot}));

  for (const matcher of matchers) {
    const matchedFile = changedFiles.find(changedFile => {
      core.debug(
        `     checking "${printPattern(
          matcher
        )}" pattern against ${changedFile}`
      );

      return matcher.match(changedFile);
    });

    if (matchedFile) {
      core.debug(
        `     "${printPattern(matcher)}" pattern matched ${matchedFile}`
      );
      return true;
    }
  }

  core.debug(`    none of the patterns matched any of the files`);
  return false;
}

export function checkIfAllGlobsMatchAnyFile(
  changedFiles: string[],
  globs: string[],
  dot: boolean
): boolean {
  core.debug(`    checking "all-globs-to-any-file" config patterns`);
  const matchers = globs.map(g => new Minimatch(g, {dot}));

  for (const changedFile of changedFiles) {
    const mismatchedGlob = matchers.find(matcher => {
      core.debug(
        `     checking "${printPattern(
          matcher
        )}" pattern against ${changedFile}`
      );

      return !matcher.match(changedFile);
    });

    if (mismatchedGlob) {
      core.debug(
        `     "${printPattern(
          mismatchedGlob
        )}" pattern did not match ${changedFile}`
      );

      continue;
    }

    core.debug(`    all patterns matched ${changedFile}`);
    return true;
  }

  core.debug(`    none of the files matched all patterns`);
  return false;
}

export function checkIfAnyGlobMatchesAllFiles(
  changedFiles: string[],
  globs: string[],
  dot: boolean
): boolean {
  core.debug(`    checking "any-glob-to-all-files" config patterns`);
  const matchers = globs.map(g => new Minimatch(g, {dot}));

  for (const matcher of matchers) {
    const mismatchedFile = changedFiles.find(changedFile => {
      core.debug(
        `     checking "${printPattern(
          matcher
        )}" pattern against ${changedFile}`
      );

      return !matcher.match(changedFile);
    });

    if (mismatchedFile) {
      core.debug(
        `     "${printPattern(
          matcher
        )}" pattern did not match ${mismatchedFile}`
      );

      continue;
    }

    core.debug(`    "${printPattern(matcher)}" pattern matched all files`);
    return true;
  }

  core.debug(`    none of the patterns matched all files`);
  return false;
}

export function checkIfAllGlobsMatchAllFiles(
  changedFiles: string[],
  globs: string[],
  dot: boolean
): boolean {
  core.debug(`    checking "all-globs-to-all-files" config patterns`);
  const matchers = globs.map(g => new Minimatch(g, {dot}));

  for (const changedFile of changedFiles) {
    const mismatchedGlob = matchers.find(matcher => {
      core.debug(
        `     checking "${printPattern(
          matcher
        )}" pattern against ${changedFile}`
      );

      return !matcher.match(changedFile);
    });

    if (mismatchedGlob) {
      core.debug(
        `     "${printPattern(
          mismatchedGlob
        )}" pattern did not match ${changedFile}`
      );

      return false;
    }
  }

  core.debug(`    all patterns matched all files`);
  return true;
}
