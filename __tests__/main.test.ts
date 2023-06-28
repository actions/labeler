import { run, Label } from '../src/labeler';
import * as github from '@actions/github';
import * as core from '@actions/core';

const fs = jest.requireActual('fs');

jest.mock('@actions/core');
jest.mock('@actions/github');

const gh = github.getOctokit('_');
const setLabelsMock = jest.spyOn(gh.rest.issues, 'setLabels');
const reposMock = jest.spyOn(gh.rest.repos, 'getContent');
const paginateMock = jest.spyOn(gh, 'paginate');
const getPullMock = jest.spyOn(gh.rest.pulls, 'get');
const coreWarningMock = jest.spyOn(core, 'warning');
const setOutputMock = jest.spyOn(core, "setOutput");

const yamlFixtures = {
  'only_pdfs.yml': fs.readFileSync('__tests__/fixtures/only_pdfs.yml')
};

const configureInput = (
  mockInput: Partial<{
    'repo-token': string;
    'configuration-path': string;
    'sync-labels': boolean;
    dot: boolean;
  }>
) => {
  jest
    .spyOn(core, 'getInput')
    .mockImplementation((name: string, ...opts) => mockInput[name]);
  jest
    .spyOn(core, 'getBooleanInput')
    .mockImplementation((name: string, ...opts) => mockInput[name]);
};

afterEach(() => jest.restoreAllMocks());

describe('run', () => {
  it('(with dot: false) adds labels to PRs that match our glob patterns', async () => {
    configureInput({});
    mockGitHubResponsePreexistingLabels("foo", "bar", "baz");
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
  });

  it('(with dot: true) does not add labels to PRs that do not match our glob patterns', async () => {
    configureInput({dot: true});
    usingLabelerConfigYaml('only_pdfs.yml');
    mockGitHubResponseChangedFiles('foo.txt');

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
    expect(setOutputMock).toHaveBeenCalledTimes(2);
    expect(setOutputMock).toHaveBeenNthCalledWith(1, "new-labels", "");
    expect(setOutputMock).toHaveBeenNthCalledWith(
      2,
      "all-labels",
      "oldskool_label"
    );
  });

  it("correctly sets output values when sync-labels is true", async () => {
    let mockInput = {
      "repo-token": "foo",
      "configuration-path": "bar",
      "sync-labels": true,
    };

    jest
      .spyOn(core, "getInput")
      .mockImplementation((name: string, ...opts) => mockInput[name]);

    usingLabelerConfigYaml("only_pdfs.yml");
    mockGitHubResponseChangedFiles();
    mockGitHubResponsePreexistingLabels("oldskool_label", "touched-a-pdf-file"); // the pdf label should get removed
    mockGitHubResponseAddLabels("oldskool_label");

    await run();

    expect(addLabelsMock).toHaveBeenCalledTimes(0);
    expect(removeLabelMock).toHaveBeenCalledTimes(1);
    expect(setOutputMock).toHaveBeenCalledTimes(2);
    expect(setOutputMock).toHaveBeenNthCalledWith(1, "new-labels", "");
    expect(setOutputMock).toHaveBeenNthCalledWith(
      2,
      "all-labels",
      "oldskool_label"
    );
  });
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

function mockGitHubResponsePreexistingLabels(...labels: string[]): void {
  getPullMock.mockResolvedValue(<any>{
    data: {
      labels: labels.map((label) => ({ name: label })),
    },
  });
}

function mockGitHubResponseAddLabels(...labelStrings: string[]): void {
  const data: Label[] = [];
  let i = 0;
  for (const label of labelStrings) {
    data.push({
      name: label,
      id: i,
      node_id: `node_id_${i}`,
      url: `https://github.com/foo/bar/${i}`,
      description: `here's label ${i}!`,
      color: "blue",
      default: false,
    });
    i++;
  }

  addLabelsMock.mockResolvedValue({
    status: 200,
    headers: {},
    url: "https://github.com/foo",
    data,
  });
}
