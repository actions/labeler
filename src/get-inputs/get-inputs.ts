import * as core from '@actions/core';
import {getPrNumbers} from './get-pr-numbers.js';

export const getInputs = () => ({
  token: core.getInput('repo-token'),
  configPath: core.getInput('configuration-path', {required: true}),
  syncLabels: core.getBooleanInput('sync-labels'),
  dot: core.getBooleanInput('dot'),
  prNumbers: getPrNumbers()
});
