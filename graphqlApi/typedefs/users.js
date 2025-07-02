import gql from "graphql-tag";

export const usersTypeDefs = gql`
  # ================== USER TYPES ==================

  type Mail {
    id: String!
    subject: String!
    body: String
    fromAddress: String!
    toAddress: String!
    timestamp: DateTime!
    isRead: Boolean!
    label: MailLabel
    parentId: String
    isEncrypted: Boolean!
    version: String
    mailbox: String
    direction: MailDirection
    labels: [MailLabel!]!
    attachments: [Attachment!]!
  }

  type UserMailbox {
    address: String!
    mails: [Mail!]!
    stats: UserStats!
    pagination: PaginationInfo!
  }

  type MailThread {
    mailId: String!
    messages: [Mail!]!
    participantCount: Int!
    messageCount: Int!
    lastActivity: DateTime!
  }

  type UserStats {
    address: String!
    totalMailsSent: Int!
    totalMailsReceived: Int!
    totalMailsRead: Int!
    unreadCount: Int!
    lastActivity: DateTime
    registrationDate: DateTime
    readPercentage: Float!
    totalActivity: Int!
  }

  type ConversationParticipants {
    address: String!
    participants: [ConversationParticipant!]!
    totalConversations: Int!
  }

  type ConversationParticipant {
    address: String!
    displayAddress: String!
    messageCount: Int!
    lastInteraction: DateTime!
    relationshipType: RelationshipType!
  }

  type UserPreferences {
    address: String!
    emailNotifications: Boolean!
    theme: String!
    language: String!
    timezone: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Attachment {
    id: String!
    filename: String!
    contentType: String!
    size: Int!
    url: String
  }

  type MailSearchResult {
    mails: [Mail!]!
    searchParams: MailSearchParams!
    pagination: PaginationInfo!
  }

  type MailSearchParams {
    query: String
    fromAddress: String
    toAddress: String
    startDate: DateTime
    endDate: DateTime
    isRead: Boolean
    hasAttachment: Boolean
  }

  # ================== INPUT TYPES ==================

  input UserPreferencesInput {
    emailNotifications: Boolean
    theme: String
    language: String
    timezone: String
  }

  input MailSearchInput {
    query: String
    fromAddress: String
    toAddress: String
    startDate: DateTime
    endDate: DateTime
    isRead: Boolean
    hasAttachment: Boolean
  }

  # ================== QUERIES ==================

  extend type Query {
    # Get user's mailbox with filtering
    getUserMailbox(
      userAddress: String!
      mailType: MailType = ALL
      limit: Int = 20
      offset: Int = 0
    ): UserMailbox!

    # Get mail thread (conversation)
    getMailThread(mailId: String!): MailThread

    # Get user statistics
    getUserStats(userAddress: String!): UserStats!

    # Search mails with filters
    searchMails(
      searchParams: MailSearchInput!
      limit: Int = 20
      offset: Int = 0
    ): MailSearchResult!

    # Get conversation participants for a user
    getConversationParticipants(
      userAddress: String!
      limit: Int = 20
    ): ConversationParticipants!
  }

  # ================== MUTATIONS ==================

  extend type Mutation {
    # Update user preferences
    updateUserPreferences(
      address: String!
      preferences: UserPreferencesInput!
    ): UserPreferences!

    # Bulk update read status
    bulkUpdateReadStatus(
      mailIds: [String!]!
      isRead: Boolean!
      userAddress: String!
    ): BulkUpdateResult!

    # Mark mail as read
    markMailAsRead(
      mailId: String!
      userAddress: String!
    ): Boolean!

    # Update mail label
    updateMailLabel(
      mailId: String!
      userAddress: String!
      label: MailLabel!
    ): Boolean!
  }
`;