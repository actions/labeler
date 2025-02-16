import {run} from '../src/labeler';
import * as github from '@actions/github';
import * as core from '@actions/core';
import path from 'path';
import fs from 'fs';

jest.mock('@actions/core');
jest.mock('@actions/github');

const gh = github.getOctokit('_');
const setLabelsMock = jest.spyOn(gh.rest.issues, 'setLabels');
const reposMock = jest.spyOn(gh.rest.repos, 'getContent');
const paginateMock = jest.spyOn(gh, 'paginate');
const getPullMock = jest.spyOn(gh.rest.pulls, 'get');
const readFileSyncMock = jest.spyOn(fs, 'readFileSync');
const existsSyncMock = jest.spyOn(fs, 'existsSync');
const coreErrorMock = jest.spyOn(core, 'error');
const coreWarningMock = jest.spyOn(core, 'warning');
const coreSetFailedMock = jest.spyOn(core, 'setFailed');
const setOutputSpy = jest.spyOn(core, 'setOutput');

class HttpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

class NotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFound';
  }
}

const yamlFixtures = {
  'branches.yml': fs.readFileSync('__tests__/fixtures/branches.yml'),
  'only_pdfs.yml': fs.readFileSync('__tests__/fixtures/only_pdfs.yml'),
  'not_supported.yml': fs.readFileSync('__tests__/fixtures/not_supported.yml'),
  'any_and_all.yml': fs.readFileSync('__tests__/fixtures/any_and_all.yml'),
  'default_any_and_all.yml': fs.readFileSync(
    '__tests__/fixtures/default_any_and_all.yml'
  )
};

const configureInput = (
  mockInput: Partial<{
    'repo-token': string;
    'configuration-path': string;
    'sync-labels': boolean;
    dot: boolean;
    'pr-number': string[];
  }>
) => {
  jest
    .spyOn(core, 'getInput')
    .mockImplementation((name: string, ...opts) => mockInput[name]);
  jest
    .spyOn(core, 'getMultilineInput')
    .mockImplementation((name: string, ...opts) => mockInput[name]);
  jest
    .spyOn(core, 'getBooleanInput')
    .mockImplementation((name: string, ...opts) => mockInput[name]);
};

afterAll(() => jest.restoreAllMocks());

describe('run', () => {
  it('(with dot: false) adds labels to PRs that match our glob patterns', async () => {
    configureInput({});
    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.pdf');
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: []
      }
    });

    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(1);

    expect(setLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['touched-a-pdf-file']
    });
    expect(setOutputSpy).toHaveBeenCalledWith(
      'new-labels',
      'touched-a-pdf-file'
    );
    expect(setOutputSpy).toHaveBeenCalledWith(
      'all-labels',
      'touched-a-pdf-file'
    );
  });

  it('(with dot: true) adds labels to PRs that match our glob patterns', async () => {
    configureInput({dot: true});
    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('.foo.pdf');
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: []
      }
    });

    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(1);
    expect(setLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['touched-a-pdf-file']
    });
    expect(setOutputSpy).toHaveBeenCalledWith(
      'new-labels',
      'touched-a-pdf-file'
    );
    expect(setOutputSpy).toHaveBeenCalledWith(
      'all-labels',
      'touched-a-pdf-file'
    );
  });

  it('(with dot: false) does not add labels to PRs that do not match our glob patterns', async () => {
    configureInput({});
    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('.foo.pdf');
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: []
      }
    });

    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(0);
    expect(setOutputSpy).toHaveBeenCalledWith('new-labels', '');
    expect(setOutputSpy).toHaveBeenCalledWith('all-labels', '');
  });

  it('(with dot: true) does not add labels to PRs that do not match our glob patterns', async () => {
    configureInput({dot: true});
    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.txt');

    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(0);
  });

  it('does not add a label when the match config options are not supported', async () => {
    configureInput({});
    usingLabelerConfigYaml('not_supported.yml');
    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(0);
  });

  it('adds labels based on the branch names that match the regexp pattern', async () => {
    configureInput({});
    github.context.payload.pull_request!.head = {ref: 'test/testing-time'};
    usingLabelerConfigYaml('branches.yml');
    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(1);
    expect(setLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['test-branch']
    });

    expect(setOutputSpy).toHaveBeenCalledWith('new-labels', 'test-branch');
    expect(setOutputSpy).toHaveBeenCalledWith('all-labels', 'test-branch');
  });

  it('adds multiple labels based on branch names that match different regexp patterns', async () => {
    configureInput({});
    github.context.payload.pull_request!.head = {
      ref: 'test/feature/123'
    };
    usingLabelerConfigYaml('branches.yml');
    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(1);
    expect(setLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['test-branch', 'feature-branch']
    });

    expect(setOutputSpy).toHaveBeenCalledWith(
      'new-labels',
      'test-branch,feature-branch'
    );
    expect(setOutputSpy).toHaveBeenCalledWith(
      'all-labels',
      'test-branch,feature-branch'
    );
  });

  it('can support multiple branches by batching', async () => {
    configureInput({});
    github.context.payload.pull_request!.head = {ref: 'fix/123'};
    usingLabelerConfigYaml('branches.yml');
    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(1);
    expect(setLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['bug-branch']
    });

    expect(setOutputSpy).toHaveBeenCalledWith('new-labels', 'bug-branch');
    expect(setOutputSpy).toHaveBeenCalledWith('all-labels', 'bug-branch');
  });

  it('can support multiple branches by providing an array', async () => {
    configureInput({});
    github.context.payload.pull_request!.head = {ref: 'array/123'};
    usingLabelerConfigYaml('branches.yml');
    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(1);
    expect(setLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['array-branch']
    });

    expect(setOutputSpy).toHaveBeenCalledWith('new-labels', 'array-branch');
    expect(setOutputSpy).toHaveBeenCalledWith('all-labels', 'array-branch');
  });

  it('adds a label when matching any and all patterns are provided', async () => {
    configureInput({});
    usingLabelerConfigYaml('any_and_all.yml');
    mockGitHubResponseChangedFiles('tests/test.ts');
    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(1);
    expect(setLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['tests']
    });

    expect(setOutputSpy).toHaveBeenCalledWith('new-labels', 'tests');
    expect(setOutputSpy).toHaveBeenCalledWith('all-labels', 'tests');
  });

  it('does not add a label when not all any and all patterns are matched', async () => {
    configureInput({});
    usingLabelerConfigYaml('any_and_all.yml');
    mockGitHubResponseChangedFiles('tests/requirements.txt');
    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(0);
  });

  it('(with sync-labels: true) it deletes preexisting PR labels that no longer match the glob pattern', async () => {
    configureInput({
      'repo-token': 'foo',
      'configuration-path': 'bar',
      'sync-labels': true
    });

    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.txt');
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: [{name: 'touched-a-pdf-file'}, {name: 'manually-added'}]
      }
    });

    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(1);
    expect(setLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['manually-added']
    });

    expect(setOutputSpy).toHaveBeenCalledWith('new-labels', '');
    expect(setOutputSpy).toHaveBeenCalledWith('all-labels', 'manually-added');
  });

  it('(with sync-labels: false) it issues no delete calls even when there are preexisting PR labels that no longer match the glob pattern', async () => {
    configureInput({
      'repo-token': 'foo',
      'configuration-path': 'bar',
      'sync-labels': false
    });

    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.txt');
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: [{name: 'touched-a-pdf-file'}, {name: 'manually-added'}]
      }
    });

    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(0);
    expect(setOutputSpy).toHaveBeenCalledWith('new-labels', '');
    expect(setOutputSpy).toHaveBeenCalledWith(
      'all-labels',
      'touched-a-pdf-file,manually-added'
    );
  });

  it('(with sync-labels: false) it only logs the excess labels', async () => {
    configureInput({
      'repo-token': 'foo',
      'configuration-path': 'bar',
      'sync-labels': false
    });

    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.pdf');

    const existingLabels = Array.from({length: 100}).map((_, idx) => ({
      name: `existing-label-${idx}`
    }));
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: existingLabels
      }
    });

    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(0);

    expect(coreWarningMock).toHaveBeenCalledTimes(1);
    expect(coreWarningMock).toHaveBeenCalledWith(
      'Maximum of 100 labels allowed. Excess labels: touched-a-pdf-file',
      {title: 'Label limit for a PR exceeded'}
    );
    const allLabels: string = existingLabels.map(i => i.name).join(',');
    expect(setOutputSpy).toHaveBeenCalledWith('new-labels', '');
    expect(setOutputSpy).toHaveBeenCalledWith('all-labels', allLabels);
  });

  it('(with pr-number: array of one item, uses the PR number specified in the parameters', async () => {
    configureInput({
      'repo-token': 'foo',
      'configuration-path': 'bar',
      'pr-number': ['104']
    });

    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.pdf');

    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: [{name: 'manually-added'}]
      }
    });

    await run();
    expect(setLabelsMock).toHaveBeenCalledTimes(1);
    expect(setLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 104,
      labels: ['manually-added', 'touched-a-pdf-file']
    });
    expect(setOutputSpy).toHaveBeenCalledWith(
      'new-labels',
      'touched-a-pdf-file'
    );
    expect(setOutputSpy).toHaveBeenCalledWith(
      'all-labels',
      'manually-added,touched-a-pdf-file'
    );
  });

  it('(with pr-number: array of two items, uses the PR number specified in the parameters', async () => {
    configureInput({
      'repo-token': 'foo',
      'configuration-path': 'bar',
      'pr-number': ['104', '150']
    });

    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.pdf');

    getPullMock.mockResolvedValueOnce(<any>{
      data: {
        labels: [{name: 'manually-added'}]
      }
    });

    getPullMock.mockResolvedValueOnce(<any>{
      data: {
        labels: []
      }
    });

    await run();
    expect(setLabelsMock).toHaveBeenCalledTimes(2);
    expect(setLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 104,
      labels: ['manually-added', 'touched-a-pdf-file']
    });
    expect(setLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 150,
      labels: ['touched-a-pdf-file']
    });
    expect(setOutputSpy).toHaveBeenCalledWith(
      'new-labels',
      'touched-a-pdf-file'
    );
    expect(setOutputSpy).toHaveBeenCalledWith(
      'all-labels',
      'manually-added,touched-a-pdf-file'
    );
  });

  it('does not add labels to PRs that have no changed files', async () => {
    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles();

    await run();

    expect(setLabelsMock).toHaveBeenCalledTimes(0);
  });

  it('should use local configuration file if it exists', async () => {
    const configFile = 'only_pdfs.yml';
    const configFilePath = path.join(__dirname, 'fixtures', configFile);
    mockGitHubResponseChangedFiles('foo.pdf');
    const readFileSyncOptions = {encoding: 'utf8'};

    configureInput({
      'configuration-path': configFilePath
    });
    await run();

    expect(existsSyncMock).toHaveBeenCalledWith(configFilePath);
    expect(readFileSyncMock).toHaveBeenCalledWith(
      configFilePath,
      readFileSyncOptions
    );
    expect(reposMock).not.toHaveBeenCalled();
  });

  it('should fetch configuration file from API if it does not exist locally', async () => {
    const configFilePath = 'non_existed_path/labeler.yml';
    mockGitHubResponseChangedFiles('foo.pdf');
    configureInput({
      'configuration-path': configFilePath
    });
    await run();
    expect(existsSyncMock).toHaveBeenCalledWith(configFilePath);
    expect(readFileSyncMock).not.toHaveBeenCalled();
    expect(reposMock).toHaveBeenCalled();
  });

  test.each([
    [new HttpError('Error message')],
    [new NotFound('Error message')]
  ])(
    'should warn if configuration file could not be fetched through the API, log error and fail the action',
    async error => {
      const configFilePath = 'non_existed_path/labeler.yml';
      reposMock.mockImplementation(() => {
        throw error;
      });
      const warningMessage = `The config file was not found at ${configFilePath}. Make sure it exists and that this action has the correct access rights.`;
      mockGitHubResponseChangedFiles('foo.pdf');
      configureInput({
        'configuration-path': configFilePath
      });

      await run();

      expect(coreWarningMock).toHaveBeenCalledWith(warningMessage);
      expect(coreErrorMock).toHaveBeenCalledWith(error);
      expect(coreSetFailedMock).toHaveBeenCalledWith(error.message);
    }
  );
});

function usingLabelerConfigYaml(fixtureName: keyof typeof yamlFixtures): void {
  reposMock.mockResolvedValue(<any>{
    data: {content: yamlFixtures[fixtureName], encoding: 'utf8'}
  });
}

function mockGitHubResponseChangedFiles(...files: string[]): void {
  const returnValue = files.map(f => ({filename: f}));
  paginateMock.mockReturnValue(<any>returnValue);
}
