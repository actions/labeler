import {ClientType} from './types.js';

const REMOVE_LABELS_MUTATION = `
  mutation RemoveLabels($labelableId: ID!, $labelIds: [ID!]!) {
    removeLabelsFromLabelable(
      input: {labelableId: $labelableId, labelIds: $labelIds}
    ) {
      clientMutationId
    }
  }
`;

export const removeLabels = async (
  client: ClientType,
  labelableId: string,
  labelIds: string[]
) => {
  await client.graphql(REMOVE_LABELS_MUTATION, {labelableId, labelIds});
};
