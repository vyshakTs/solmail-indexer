import { PubSub } from 'graphql-subscriptions';
import {
    MailSendEventModel,
    MailV2SendEventModel,
    MailV2UpdateEventModel,
    MailV2ReadEventModel,
    MailV2UpdateLabelEventModel
} from '../modals/index.js';
import { MailDataHelper } from '../helpers/index.js';
import { logger } from '../core/index.js';
import { resolverErrorHandler } from '../core/errorHandler.js';


const pubsub = new PubSub();

export const mailEventsResolvers = {
    Query: {
        getMailSendEvents: resolverErrorHandler(async (_, args) => {
            logger.info('getMailSendEvents called', args);
            
            const { limit, offset, fromAddress, toAddress } = args;
            const filters = {};
            if (fromAddress) filters.from_address = fromAddress;
            if (toAddress) filters.to_address = toAddress;

            const events = await MailSendEventModel.findAll(filters, { limit, offset });
            const total = await MailSendEventModel.count(filters);

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

        getMailV2SendEvents: resolverErrorHandler(async (_, args) => {
            logger.info('getMailV2SendEvents called', args);
            
            const { limit, offset, fromAddress, toAddress, mailbox } = args;
            const filters = {};
            if (fromAddress) filters.from_address = fromAddress;
            if (toAddress) filters.to_address = toAddress;
            if (mailbox) filters.mailbox = mailbox;

            const events = await MailV2SendEventModel.findAll(filters, { limit, offset });
            const total = await MailV2SendEventModel.count(filters);

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

        getMailV2UpdateEvents: resolverErrorHandler(async (_, args) => {
            logger.info('getMailV2UpdateEvents called', args);
            
            const { limit, offset, mailId, fromAddress } = args;
            const filters = {};
            if (mailId) filters.mail_id = mailId;
            if (fromAddress) filters.from_address = fromAddress;

            const events = await MailV2UpdateEventModel.findAll(filters, { limit, offset });
            const total = await MailV2UpdateEventModel.count(filters);

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

        getMailV2ReadEvents: resolverErrorHandler(async (_, args) => {
            logger.info('getMailV2ReadEvents called', args);
            
            const { limit, offset, mailId, owner } = args;
            const filters = {};
            if (mailId) filters.mail_id = mailId;
            if (owner) filters.owner = owner;

            const events = await MailV2ReadEventModel.findAll(filters, { limit, offset });
            const total = await MailV2ReadEventModel.count(filters);

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

        getMailV2UpdateLabelEvents: resolverErrorHandler(async (_, args) => {
            logger.info('getMailV2UpdateLabelEvents called', args);
            
            const { limit, offset, mailId, owner } = args;
            const filters = {};
            if (mailId) filters.mail_id = mailId;
            if (owner) filters.owner = owner;

            const events = await MailV2UpdateLabelEventModel.findAll(filters, { limit, offset });
            const total = await MailV2UpdateLabelEventModel.count(filters);

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
    },

    Mutation: {
        recordMailSendEvent: resolverErrorHandler(async (_, args) => {
            logger.info('recordMailSendEvent called');
            
            const { input } = args;
            const event = await MailSendEventModel.create(input);
            
            // Publish to subscription
            pubsub.publish('MAIL_SENT', {
                mailSent: event
            });

            return event;
        }),

        recordMailV2SendEvent: resolverErrorHandler(async (_, args) => {
            logger.info('recordMailV2SendEvent called');
            
            const { input } = args;
            const event = await MailV2SendEventModel.create(input);
            
            // Publish to subscription
            pubsub.publish('MAIL_SENT', {
                mailSent: event
            });

            // Invalidate relevant caches
            await MailDataHelper.invalidateUserCache(input.fromAddress);
            await MailDataHelper.invalidateUserCache(input.toAddress);

            return event;
        }),

        recordMailV2UpdateEvent: resolverErrorHandler(async (_, args) => {
            logger.info('recordMailV2UpdateEvent called');
            
            const { input } = args;
            
            // In a real implementation, this would create the event
            const event = {
                id: crypto.randomUUID(),
                ...input,
                timestamp: new Date()
            };
            
            // Publish to subscription
            pubsub.publish('MAIL_UPDATED', {
                mailUpdated: event
            });

            // Invalidate relevant caches
            await MailDataHelper.invalidateUserCache(input.fromAddress);
            await MailDataHelper.invalidateUserCache(input.toAddress);
            await MailDataHelper.invalidateMailCache(input.mailId);

            return event;
        })
    },

    Subscription: {
        mailSent: {
            subscribe: (_, args) => {
                logger.info('mailSent subscription started');
                
                const { toAddress } = args;
                if (toAddress) {
                    return pubsub.asyncIterator([`MAIL_SENT_${toAddress}`]);
                }
                return pubsub.asyncIterator(['MAIL_SENT']);
            }
        },

        mailUpdated: {
            subscribe: (_, args) => {
                logger.info('mailUpdated subscription started');
                
                const { mailId } = args;
                if (mailId) {
                    return pubsub.asyncIterator([`MAIL_UPDATED_${mailId}`]);
                }
                return pubsub.asyncIterator(['MAIL_UPDATED']);
            }
        },

        mailRead: {
            subscribe: (_, args) => {
                logger.info('mailRead subscription started');
                
                const { owner } = args;
                if (owner) {
                    return pubsub.asyncIterator([`MAIL_READ_${owner}`]);
                }
                return pubsub.asyncIterator(['MAIL_READ']);
            }
        }
    }
};