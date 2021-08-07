export const context = {
  payload: {
    pull_request: {
      number: 123,
    },
  },
  repo: {
    owner: "monalisa",
    repo: "helloworld",
  },
  ref: "test/testing-time",
};

const mockApi = {
  rest: {
    issues: {
      addLabels: jest.fn(),
      removeLabel: jest.fn(),
    },
    pulls: {
      get: jest.fn().mockResolvedValue({}),
      listFiles: {
        endpoint: {
          merge: jest.fn().mockReturnValue({}),
        },
      },
    },
    repos: {
      getContent: jest.fn(),
    },
  },
  paginate: jest.fn(),
};

export const getOctokit = jest.fn().mockImplementation(() => mockApi);
