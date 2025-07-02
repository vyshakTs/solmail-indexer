import _ from 'lodash';

import { baseResolvers } from './base.js';
import { mailEventsResolvers } from './mailEvents.js';
import { accountEventsResolvers } from './accountEvents.js';
import { instructionsResolvers } from './instructions.js';
import { usersResolvers } from './users.js';
import { analyticsResolvers } from './analytics.js';
import { utilitiesResolvers } from './utilities.js';

// Combine all resolvers using lodash merge for deep merging
export const resolvers = _.merge(
    {},
    baseResolvers,
    mailEventsResolvers,
    accountEventsResolvers,
    instructionsResolvers,
    usersResolvers,
    analyticsResolvers,
    utilitiesResolvers
);