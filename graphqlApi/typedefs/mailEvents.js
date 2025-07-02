import gql from "graphql-tag";

export const mailEventsTypeDefs = gql`
  # ================== MAIL EVENT TYPES ==================

  type MailSendEvent {
    id: String!
    trxHash: String!
    fromAddress: String!
    toAddress: String!
    mailId: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type MailV2SendEvent {
    id: String!
    trxHash: String!
    fromAddress: String!
    toAddress: String!
    mailId: String!
    mailbox: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type MailV2UpdateEvent {
    id: String!
    trxHash: String!
    fromAddress: String!
    toAddress: String!
    mailId: String!
    mailbox: String!
    parentId: String
    markAsRead: Boolean!
    createdAtTimestamp: BigInt
    subject: String!
    body: String
    authority: String!
    iv: String
    salt: String
    version: String!
    timestamp: DateTime!
    createdAt: DateTime!
    level: Int
  }

  type MailV2ReadEvent {
    id: String!
    trxHash: String!
    mailId: String!
    owner: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type MailV2UpdateLabelEvent {
    id: String!
    trxHash: String!
    mailId: String!
    owner: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  # ================== CONNECTION TYPES ==================

  type MailSendEventConnection {
    events: [MailSendEvent!]!
    pagination: PaginationInfo!
  }

  type MailV2SendEventConnection {
    events: [MailV2SendEvent!]!
    pagination: PaginationInfo!
  }

  type MailV2UpdateEventConnection {
    events: [MailV2UpdateEvent!]!
    pagination: PaginationInfo!
  }

  type MailV2ReadEventConnection {
    events: [MailV2ReadEvent!]!
    pagination: PaginationInfo!
  }

  type MailV2UpdateLabelEventConnection {
    events: [MailV2UpdateLabelEvent!]!
    pagination: PaginationInfo!
  }

  # ================== INPUT TYPES ==================

  input MailSendEventInput {
    trxHash: String!
    fromAddress: String!
    toAddress: String!
    mailId: String!
  }

  input MailV2SendEventInput {
    trxHash: String!
    fromAddress: String!
    toAddress: String!
    mailId: String!
    mailbox: String!
  }

  input MailV2UpdateEventInput {
    trxHash: String!
    fromAddress: String!
    toAddress: String!
    mailId: String!
    mailbox: String!
    parentId: String
    markAsRead: Boolean!
    createdAtTimestamp: BigInt
    subject: String!
    body: String
    authority: String!
    iv: String
    salt: String
    version: String!
  }

  # ================== QUERIES ==================

  extend type Query {
    # Get mail send events
    getMailSendEvents(
      limit: Int = 20
      offset: Int = 0
      fromAddress: String
      toAddress: String
    ): MailSendEventConnection!

    # Get mail v2 send events
    getMailV2SendEvents(
      limit: Int = 20
      offset: Int = 0
      fromAddress: String
      toAddress: String
      mailbox: String
    ): MailV2SendEventConnection!

    # Get mail v2 update events
    getMailV2UpdateEvents(
      limit: Int = 20
      offset: Int = 0
      mailId: String
      fromAddress: String
    ): MailV2UpdateEventConnection!

    # Get mail v2 read events
    getMailV2ReadEvents(
      limit: Int = 20
      offset: Int = 0
      mailId: String
      owner: String
    ): MailV2ReadEventConnection!

    # Get mail v2 update label events
    getMailV2UpdateLabelEvents(
      limit: Int = 20
      offset: Int = 0
      mailId: String
      owner: String
    ): MailV2UpdateLabelEventConnection!
  }

  # ================== MUTATIONS ==================

  extend type Mutation {
    recordMailSendEvent(input: MailSendEventInput!): MailSendEvent!
    recordMailV2SendEvent(input: MailV2SendEventInput!): MailV2SendEvent!
    recordMailV2UpdateEvent(input: MailV2UpdateEventInput!): MailV2UpdateEvent!
  }

  # ================== SUBSCRIPTIONS ==================

  extend type Subscription {
    mailSent(toAddress: String): MailV2SendEvent!
    mailUpdated(mailId: String): MailV2UpdateEvent!
    mailRead(owner: String): MailV2ReadEvent!
  }
`;