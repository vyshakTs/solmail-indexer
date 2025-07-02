import gql from "graphql-tag";

export const analyticsTypeDefs = gql`
  # ================== ANALYTICS TYPES ==================

  type MailAnalytics {
    totalMails: Int!
    totalUsers: Int!
    mailsToday: Int!
    mailsThisWeek: Int!
    mailsThisMonth: Int!
    avgMailsPerDay: Float!
    dailyBreakdown: [DailyBreakdown!]!
    topSenders: [AddressStats!]!
    topReceivers: [AddressStats!]!
    engagementMetrics: EngagementMetrics!
    trends: TrendAnalysis!
    growthRate: Float!
    activeUserPercentage: Float!
    generatedAt: DateTime!
    dateRange: DateRange!
  }

  type TimeSeriesData {
    timeframe: TimeFrame!
    data: [TimeSeriesPoint!]!
    summary: TimeSeriesSummary!
    generatedAt: DateTime!
  }

  type NetworkAnalysis {
    nodes: [NetworkNode!]!
    edges: [NetworkEdge!]!
    stats: NetworkStats!
    generatedAt: DateTime!
  }

  type Leaderboards {
    topSenders: [LeaderboardEntry!]!
    topReceivers: [LeaderboardEntry!]!
    timeframe: String!
    generatedAt: DateTime!
  }

  type AddressStats {
    address: String!
    displayAddress: String!
    count: Int!
    percentage: Float!
    firstMail: DateTime
    lastMail: DateTime
  }

  # ================== SUPPORTING ANALYTICS TYPES ==================

  type DailyBreakdown {
    date: DateTime!
    count: Int!
  }

  type EngagementMetrics {
    totalUsers: Int!
    avgActivityPerUser: Float!
    medianActivity: Float!
    activeUsers: Int!
    powerUsers: Int!
  }

  type TrendAnalysis {
    direction: TrendDirection!
    percentage: Float!
    recentAverage: Float!
    previousAverage: Float!
  }

  type DateRange {
    startDate: DateTime
    endDate: DateTime
    isCustomRange: Boolean!
  }

  type TimeSeriesPoint {
    period: DateTime!
    mailCount: Int!
    uniqueSenders: Int!
    uniqueReceivers: Int!
    movingAverage: Float!
    growthRate: Float!
    formattedPeriod: String!
  }

  type TimeSeriesSummary {
    totalPeriods: Int!
    totalMails: Int!
    averagePerPeriod: Float!
    peakPeriod: TimeSeriesPoint!
  }

  type NetworkNode {
    id: String!
    label: String!
    type: String!
    outgoingConnections: Int!
    incomingConnections: Int!
    totalMessages: Int!
    degree: Int!
    centrality: Float!
  }

  type NetworkEdge {
    from: String!
    to: String!
    weight: Int!
    label: String!
    firstInteraction: DateTime!
    lastInteraction: DateTime!
  }

  type NetworkStats {
    totalNodes: Int!
    totalEdges: Int!
    averageDegree: Float!
    mostConnectedUser: NetworkNode!
    mostActiveUser: NetworkNode!
  }

  type LeaderboardEntry {
    rank: Int!
    address: String!
    displayAddress: String!
    count: Int!
    percentage: Float!
    firstMail: DateTime
    lastMail: DateTime
  }

  # ================== QUERIES ==================

  extend type Query {
    # Get comprehensive mail analytics
    getMailAnalytics(
      startDate: DateTime
      endDate: DateTime
      includeBreakdown: Boolean = true
    ): MailAnalytics!

    # Get time series data for charts
    getTimeSeriesData(
      timeframe: TimeFrame = DAY
      limit: Int = 30
    ): TimeSeriesData!

    # Get network analysis
    getNetworkAnalysis(
      limit: Int = 50
      minInteractions: Int = 2
    ): NetworkAnalysis!

    # Get leaderboards
    getLeaderboards(
      category: LeaderboardCategory = ALL
      limit: Int = 20
      timeframe: TimeFrame
    ): Leaderboards!

    # Get top senders
    getTopSenders(
      limit: Int = 10
      startDate: DateTime
      endDate: DateTime
    ): [AddressStats!]!

    # Get top receivers
    getTopReceivers(
      limit: Int = 10
      startDate: DateTime
      endDate: DateTime
    ): [AddressStats!]!
  }

  # ================== SUBSCRIPTIONS ==================

  extend type Subscription {
    # Real-time analytics updates
    analyticsUpdated: MailAnalytics!
  }
`;