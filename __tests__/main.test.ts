import {run, PrFileType} from '../src/labeler';
import * as github from '@actions/github';
import * as core from '@actions/core';

const fs = jest.requireActual('fs');

jest.mock('@actions/core');
jest.mock('@actions/github');

type mockGitHubResponseChangedFilesType = {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
};

const gh = github.getOctokit('_');
const addLabelsMock = jest.spyOn(gh.rest.issues, 'addLabels');
const removeLabelMock = jest.spyOn(gh.rest.issues, 'removeLabel');
const reposMock = jest.spyOn(gh.rest.repos, 'getContent');
const paginateMock = jest.spyOn(gh, 'paginate');
const getPullMock = jest.spyOn(gh.rest.pulls, 'get');

const yamlFixtures = {
  'branches.yml': fs.readFileSync('__tests__/fixtures/branches.yml'),
  'only_pdfs.yml': fs.readFileSync('__tests__/fixtures/only_pdfs.yml'),
  'only_pdfs_custom_size.yml': fs.readFileSync(
    '__tests__/fixtures/only_pdfs_custom_size.yml'
  ),
  'not_supported.yml': fs.readFileSync('__tests__/fixtures/not_supported.yml'),
  'any_and_all.yml': fs.readFileSync('__tests__/fixtures/any_and_all.yml')
};

afterAll(() => jest.restoreAllMocks());

describe('run', () => {
  it('adds labels to PRs that match our glob patterns', async () => {
    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles({
      filename: 'foo.pdf',
      additions: 10,
      deletions: 10,
      changes: 10
    });

    await run();

    expect(removeLabelMock).toHaveBeenCalledTimes(0);
    expect(addLabelsMock).toHaveBeenCalledTimes(1);
    expect(addLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['touched-a-pdf-file']
    });
  });

  it('does not add labels to PRs that do not match our glob patterns', async () => {
    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles({
      filename: 'foo.txt',
      additions: 10,
      deletions: 10,
      changes: 10
    });

    await run();

    expect(removeLabelMock).toHaveBeenCalledTimes(0);
    expect(addLabelsMock).toHaveBeenCalledTimes(0);
  });

  it('does not add a label when the match config options are not supported', async () => {
    usingLabelerConfigYaml('not_supported.yml');
    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(0);
    expect(removeLabelMock).toHaveBeenCalledTimes(0);
  });

  it('(with sync-labels: true) it deletes preexisting PR labels that no longer match the glob pattern', async () => {
    const mockInput = {
      'repo-token': 'foo',
      'configuration-path': 'bar',
      'sync-labels': 'true'
    };

    jest
      .spyOn(core, 'getInput')
      .mockImplementation((name: string, ...opts) => mockInput[name]);
    jest
      .spyOn(core, 'getBooleanInput')
      .mockImplementation(
        (name: string, ...opts) => mockInput[name] === 'true'
      );

    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles({
      filename: 'foo.txt',
      additions: 10,
      deletions: 10,
      changes: 10
    });
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: [{name: 'touched-a-pdf-file'}]
      }
    });

    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(0);
    expect(removeLabelMock).toHaveBeenCalledTimes(1);
    expect(removeLabelMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      name: 'touched-a-pdf-file'
    });
  });

  it('(with sync-labels: false) it issues no delete calls even when there are preexisting PR labels that no longer match the glob pattern', async () => {
    const mockInput = {
      'repo-token': 'foo',
      'configuration-path': 'bar',
      'sync-labels': 'false'
    };

    jest
      .spyOn(core, 'getInput')
      .mockImplementation((name: string, ...opts) => mockInput[name]);
    jest
      .spyOn(core, 'getBooleanInput')
      .mockImplementation(
        (name: string, ...opts) => mockInput[name] === 'true'
      );

    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles({
      filename: 'foo.txt',
      additions: 10,
      deletions: 10,
      changes: 10
    });
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: [{name: 'touched-a-pdf-file'}]
      }
    });

    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(0);
    expect(removeLabelMock).toHaveBeenCalledTimes(0);
  });

  it('adds labels based on the branch names that match the regexp pattern', async () => {
    github.context.payload.pull_request!.head = {ref: 'test/testing-time'};
    usingLabelerConfigYaml('branches.yml');
    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(1);
    expect(addLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['test-branch']
    });
  });

  it('adds multiple labels based on branch names that match different regexp patterns', async () => {
    github.context.payload.pull_request!.head = {
      ref: 'test/feature/123'
    };
    usingLabelerConfigYaml('branches.yml');
    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(1);
    expect(addLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['test-branch', 'feature-branch']
    });
  });

  it('can support multiple branches by batching', async () => {
    github.context.payload.pull_request!.head = {ref: 'fix/123'};
    usingLabelerConfigYaml('branches.yml');
    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(1);
    expect(addLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['bug-branch']
    });
  });

  it('can support multiple branches by providing an array', async () => {
    github.context.payload.pull_request!.head = {ref: 'array/123'};
    usingLabelerConfigYaml('branches.yml');
    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(1);
    expect(addLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['array-branch']
    });
  });

  it('adds a label when matching any and all patterns are provided', async () => {
    usingLabelerConfigYaml('any_and_all.yml');
    mockGitHubResponseChangedFiles({
      filename: 'tests/test.ts',
      additions: 10,
      deletions: 10,
      changes: 10
    });
    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(1);
    expect(addLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['tests']
    });
  });

  it('does not add a label when not all any and all patterns are matched', async () => {
    usingLabelerConfigYaml('any_and_all.yml');
    mockGitHubResponseChangedFiles({
      filename: 'tests/requirements.txt',
      additions: 10,
      deletions: 10,
      changes: 10
    });
    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(0);
    expect(removeLabelMock).toHaveBeenCalledTimes(0);
  });

  it('(with check-size: true, sync-labels: true) it deletes preexisting PR labels that no longer match the glob pattern and adds the size label', async () => {
    const mockInput = {
      'repo-token': 'foo',
      'configuration-path': 'bar',
      'check-size': 'true',
      'sync-labels': 'true'
    };

    jest
      .spyOn(core, 'getInput')
      .mockImplementation((name: string, ...opts) => mockInput[name]);
    jest
      .spyOn(core, 'getBooleanInput')
      .mockImplementation(
        (name: string, ...opts) => mockInput[name] === 'true'
      );

    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles({
      filename: 'foo.txt',
      additions: 10,
      deletions: 10,
      changes: 10
    });
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: [{name: 'touched-a-pdf-file'}]
      }
    });

    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(1);
    expect(addLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['size/M']
    });
    expect(removeLabelMock).toHaveBeenCalledTimes(1);
    expect(removeLabelMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      name: 'touched-a-pdf-file'
    });
  });

  it('(with check-size: true) adds a label based on the PR size', async () => {
    const mockInput = {
      'repo-token': 'foo',
      'configuration-path': 'bar',
      'check-size': 'true'
    };

    jest
      .spyOn(core, 'getInput')
      .mockImplementation((name: string, ...opts) => mockInput[name]);
    jest
      .spyOn(core, 'getBooleanInput')
      .mockImplementation(
        (name: string, ...opts) => mockInput[name] === 'true'
      );

    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles({
      filename: 'foo.txt',
      additions: 10,
      deletions: 10,
      changes: 10
    });
    getPullMock.mockResolvedValue(<any>{
      data: {
        labels: [{name: 'touched-a-pdf-file'}]
      }
    });

    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(1);
    expect(addLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['size/M']
    });
  });
});

it('(with check-size: true with custom size config) adds a label based on the PR size and customf size config', async () => {
  const mockInput = {
    'repo-token': 'foo',
    'configuration-path': 'bar',
    'check-size': 'true'
  };

  jest
    .spyOn(core, 'getInput')
    .mockImplementation((name: string, ...opts) => mockInput[name]);
  jest
    .spyOn(core, 'getBooleanInput')
    .mockImplementation((name: string, ...opts) => mockInput[name] === 'true');

  usingLabelerConfigYaml('only_pdfs_custom_size.yml');
  mockGitHubResponseChangedFiles({
    filename: 'foo.txt',
    additions: 10,
    deletions: 10,
    changes: 10
  });
  getPullMock.mockResolvedValue(<any>{
    data: {
      labels: [{name: 'touched-a-pdf-file'}]
    }
  });

  await run();

  expect(addLabelsMock).toHaveBeenCalledTimes(1);
  expect(addLabelsMock).toHaveBeenCalledWith({
    owner: 'monalisa',
    repo: 'helloworld',
    issue_number: 123,
    labels: ['size/XXS']
  });
});

function usingLabelerConfigYaml(fixtureName: keyof typeof yamlFixtures): void {
  reposMock.mockResolvedValue(<any>{
    data: {content: yamlFixtures[fixtureName], encoding: 'utf8'}
  });
}

function mockGitHubResponseChangedFiles(
  ...files: mockGitHubResponseChangedFilesType[]
): void {
  const returnValue = files.map(f => ({
    filename: f.filename,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes
  }));
  paginateMock.mockReturnValue(<any>returnValue);
}
