import {
    MailAccountV2RegisterEventModel,
    MailAccountV2UpdateEventModel
} from '../modals/index.js';
import { logger, resolverErrorHandler } from '../core/index.js';

export const accountEventsResolvers = {
    Query: {
        getMailAccountV2RegisterEvents: resolverErrorHandler(async (_, args) => {
            logger.info('getMailAccountV2RegisterEvents called', args);
            
            const { limit, offset, owner } = args;
            const filters = {};
            if (owner) filters.owner = owner;

            const events = await MailAccountV2RegisterEventModel.findAll(filters, { limit, offset });
            const total = await MailAccountV2RegisterEventModel.count(filters);

            return {
                events,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };
        }),

        getMailAccountV2UpdateEvents: resolverErrorHandler(async (_, args) => {
            logger.info('getMailAccountV2UpdateEvents called', args);
            
            const { limit, offset, owner } = args;
            const filters = {};
            if (owner) filters.owner = owner;

            const events = await MailAccountV2UpdateEventModel.findAll(filters, { limit, offset });
            const total = await MailAccountV2UpdateEventModel.count(filters);

            return {
                events,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };
        })
    }
};