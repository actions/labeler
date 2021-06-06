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
};

const mockApi = {
  issues: {
    addLabels: jest.fn(),
    removeLabel: jest.fn(),
  },
  paginate: jest.fn(),
  pulls: {
    get: jest.fn().mockResolvedValue({}),
    listFiles: {
      endpoint: {
        merge: jest.fn().mockReturnValue({}),
      },
    },
  },
  repos: {
    getContents: jest.fn(),
  },
};

export const GitHub = jest.fn().mockImplementation(() => mockApi);
