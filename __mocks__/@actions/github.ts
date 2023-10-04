export const context = {
  payload: {
    pull_request: {
      number: 123
    }
  },
  repo: {
    owner: 'monalisa',
    repo: 'helloworld'
  }
};

const mockApi = {
  rest: {
    issues: {
      setLabels: jest.fn(),
      updateLabel: jest.fn()
    },
    pulls: {
      get: jest.fn().mockResolvedValue({
        data: {
          labels: []
        }
      }),
      listFiles: {
        endpoint: {
          merge: jest.fn().mockReturnValue({})
        }
      }
    },
    repos: {
      getContent: jest.fn()
    }
  },
  paginate: jest.fn()
};

export const getOctokit = jest.fn().mockImplementation(() => mockApi);
