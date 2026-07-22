import {jest, describe, it, expect} from '@jest/globals';
import type {ClientType} from '../src/api/types.js';

jest.unstable_mockModule('@actions/github', () => ({
  context: {
    repo: {owner: 'monalisa', repo: 'helloworld'}
  }
}));

const {addLabels} = await import('../src/api/add-labels.js');

const createClient = () => {
  const addLabelsMock = jest.fn<any>();
  const listLabelsOnIssueMock = jest.fn<any>();
  const client = {
    rest: {
      issues: {
        addLabels: addLabelsMock,
        listLabelsOnIssue: listLabelsOnIssueMock
      }
    }
  } as ClientType;

  return {client, addLabelsMock, listLabelsOnIssueMock};
};

describe('addLabels', () => {
  it('does not verify a successful addition', async () => {
    const {client, addLabelsMock, listLabelsOnIssueMock} = createClient();
    addLabelsMock.mockResolvedValue({data: []});

    await addLabels(client, 123, ['bug']);

    expect(addLabelsMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      labels: ['bug'],
      request: {retries: 0}
    });
    expect(listLabelsOnIssueMock).not.toHaveBeenCalled();
  });

  it('accepts a server error when every requested label was committed', async () => {
    const {client, addLabelsMock, listLabelsOnIssueMock} = createClient();
    const serverError = Object.assign(new Error('Bad Gateway'), {status: 502});
    addLabelsMock.mockRejectedValue(serverError);
    listLabelsOnIssueMock.mockResolvedValue({
      data: [{name: 'BUG'}, {name: 'documentation'}]
    });

    await expect(
      addLabels(client, 123, ['bug', 'documentation'])
    ).resolves.toBeUndefined();
    expect(listLabelsOnIssueMock).toHaveBeenCalledWith({
      owner: 'monalisa',
      repo: 'helloworld',
      issue_number: 123,
      per_page: 100,
      request: {retries: 0}
    });
  });

  it('preserves a server error when any requested label is missing', async () => {
    const {client, addLabelsMock, listLabelsOnIssueMock} = createClient();
    const serverError = Object.assign(new Error('Bad Gateway'), {status: 502});
    addLabelsMock.mockRejectedValue(serverError);
    listLabelsOnIssueMock.mockResolvedValue({data: [{name: 'bug'}]});

    await expect(addLabels(client, 123, ['bug', 'documentation'])).rejects.toBe(
      serverError
    );
  });

  it('does not verify non-server errors', async () => {
    const {client, addLabelsMock, listLabelsOnIssueMock} = createClient();
    const validationError = Object.assign(new Error('Validation Failed'), {
      status: 422
    });
    addLabelsMock.mockRejectedValue(validationError);

    await expect(addLabels(client, 123, ['bug'])).rejects.toBe(validationError);
    expect(listLabelsOnIssueMock).not.toHaveBeenCalled();
  });

  it('preserves the server error when verification fails', async () => {
    const {client, addLabelsMock, listLabelsOnIssueMock} = createClient();
    const serverError = Object.assign(new Error('Bad Gateway'), {status: 502});
    addLabelsMock.mockRejectedValue(serverError);
    listLabelsOnIssueMock.mockRejectedValue(new Error('Service unavailable'));

    await expect(addLabels(client, 123, ['bug'])).rejects.toBe(serverError);
  });
});
