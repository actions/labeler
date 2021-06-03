import { run } from "../src/labeler";
import { GitHub } from "@actions/github";

const fs = jest.requireActual("fs");

jest.mock("@actions/core");
jest.mock("@actions/github");

const gh = new GitHub("_");
const addLabelsMock = jest.spyOn(gh.issues, "addLabels");
const removeLabelMock = jest.spyOn(gh.issues, "removeLabel");
const reposMock = jest.spyOn(gh.repos, "getContents");
const paginateMock = jest.spyOn(gh, "paginate");

const yamlFixtures = {
  "only_pdfs.yml": fs.readFileSync("__tests__/fixtures/only_pdfs.yml"),
};

function usingLabelerConfigYaml(fixtureName: keyof typeof yamlFixtures): void {
  reposMock.mockResolvedValue(<any>{
    data: { content: yamlFixtures[fixtureName], encoding: "utf8" },
  });
}

function mockGitHubResponseChangedFiles(...files: string[]): void {
  const returnValue = files.map((f) => ({ filename: f }));
  paginateMock.mockReturnValue(<any>returnValue);
}

afterAll(() => jest.restoreAllMocks());

describe("run", () => {
  it("adds labels to PRs that match our glob patterns", async () => {
    usingLabelerConfigYaml("only_pdfs.yml");
    mockGitHubResponseChangedFiles("foo.pdf");

    await run();

    expect(removeLabelMock).toHaveBeenCalledTimes(0);
    expect(addLabelsMock).toHaveBeenCalledTimes(1);
    expect(addLabelsMock).toHaveBeenCalledWith({
      owner: "monalisa",
      repo: "helloworld",
      issue_number: 123,
      labels: ["touched-a-pdf-file"],
    });
  });

  it("does not add labels to PRs that do not match our glob patterns", async () => {
    usingLabelerConfigYaml("only_pdfs.yml");
    mockGitHubResponseChangedFiles("foo.txt");

    await run();

    expect(removeLabelMock).toHaveBeenCalledTimes(0);
    expect(addLabelsMock).toHaveBeenCalledTimes(0);
  });
});
