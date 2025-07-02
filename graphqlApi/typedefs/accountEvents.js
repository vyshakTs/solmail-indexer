import gql from "graphql-tag";

export const accountEventsTypeDefs = gql`
  # ================== ACCOUNT EVENT TYPES ==================

  type MailAccountV2RegisterEvent {
    id: String!
    trxHash: String!
    owner: String!
    account: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type MailAccountV2UpdateEvent {
    id: String!
    trxHash: String!
    owner: String!
    account: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  # ================== CONNECTION TYPES ==================

  type MailAccountV2RegisterEventConnection {
    events: [MailAccountV2RegisterEvent!]!
    pagination: PaginationInfo!
  }

  type MailAccountV2UpdateEventConnection {
    events: [MailAccountV2UpdateEvent!]!
    pagination: PaginationInfo!
  }

  # ================== QUERIES ==================

  extend type Query {
    # Get mail account v2 register events
    getMailAccountV2RegisterEvents(
      limit: Int = 20
      offset: Int = 0
      owner: String
    ): MailAccountV2RegisterEventConnection!

    # Get mail account v2 update events
    getMailAccountV2UpdateEvents(
      limit: Int = 20
      offset: Int = 0
      owner: String
    ): MailAccountV2UpdateEventConnection!
  }
`;