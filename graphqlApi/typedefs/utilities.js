import gql from "graphql-tag";

export const utilitiesTypeDefs = gql`
  # ================== UTILITY QUERIES ==================

  extend type Query {
    # Get API information
    getApiInfo: ApiInfo!

    # Health check
    healthCheck: HealthStatus!
  }

  # ================== CACHE MANAGEMENT ==================

  extend type Mutation {
    # Invalidate user cache (admin only)
    invalidateUserCache(address: String!): Boolean!
    
    # Invalidate analytics cache (admin only)
    invalidateAnalyticsCache: Boolean!
  }
`;