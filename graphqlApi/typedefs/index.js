import { baseTypeDefs } from './base.js';
import { mailEventsTypeDefs } from './mailEvents.js';
import { accountEventsTypeDefs } from './accountEvents.js';
import { instructionsTypeDefs } from './instructions.js';
import { usersTypeDefs } from './users.js';
import { analyticsTypeDefs } from './analytics.js';
import { utilitiesTypeDefs } from './utilities.js';

// Combine all type definitions
export const typeDefs = [
    baseTypeDefs,
    mailEventsTypeDefs,
    accountEventsTypeDefs,
    instructionsTypeDefs,
    usersTypeDefs,
    analyticsTypeDefs,
    utilitiesTypeDefs
];