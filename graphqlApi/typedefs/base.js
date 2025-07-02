// typedefs/base.js
import gql from "graphql-tag";

export const baseTypeDefs = gql`
  # Custom scalar types
  scalar DateTime
  scalar BigInt

  # Root types
  type Query
  type Mutation  
  type Subscription

  # Common pagination type
  type PaginationInfo {
    total: Int
    limit: Int!
    offset: Int!
    hasNext: Boolean!
    hasPrev: Boolean!
  }

  # Common utility types
  type ApiInfo {
    version: String!
    name: String!
    description: String!
    environment: String!
    uptime: String!
    buildDate: DateTime!
  }

  type HealthStatus {
    status: String!
    timestamp: DateTime!
    database: String!
    cache: String!
    version: String!
    uptime: Int!
  }

  # Common result types
  type BulkUpdateResult {
    success: Boolean!
    updatedCount: Int!
    mailIds: [String!]!
  }

  # Common enums
  enum MailType {
    ALL
    SENT
    RECEIVED
    UNREAD
    READ
  }

  enum MailLabel {
    INBOX
    SENT
    OUTBOX
    DRAFT
    TRASH
    SPAM
    IMPORTANT
    ARCHIVED
  }

  enum MailDirection {
    INCOMING
    OUTGOING
  }

  enum TimeFrame {
    HOUR
    DAY
    WEEK
    MONTH
  }

  enum TrendDirection {
    UP
    DOWN
    STABLE
  }

  enum RelationshipType {
    FREQUENT
    OCCASIONAL
    RECENT
    HISTORICAL
  }

  enum LeaderboardCategory {
    ALL
    SENDERS
    RECEIVERS
    ACTIVE_USERS
  }
`;