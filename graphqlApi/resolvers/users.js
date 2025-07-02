import { UserPreferencesModel } from '../modals/index.js';
import { MailDataHelper, MailTransformHelper } from '../helpers/index.js';
import { logger, resolverErrorHandler, ValidationError } from '../core/index.js';


export const usersResolvers = {
    Query: {
        getUserMailbox: resolverErrorHandler(async (_, args) => {
            logger.info('getUserMailbox called', { userAddress: args.userAddress, mailType: args.mailType });
            
            const { userAddress, mailType, limit, offset } = args;
            
            if (!userAddress) {
                throw new ValidationError('User address is required');
            }

            return await MailDataHelper.getUserMailbox(userAddress, mailType, { limit, offset });
        }),

        getMailThread: resolverErrorHandler(async (_, args) => {
            logger.info('getMailThread called', { mailId: args.mailId });
            
            const { mailId } = args;
            
            if (!mailId) {
                throw new ValidationError('Mail ID is required');
            }

            return await MailDataHelper.getMailThread(mailId);
        }),

        getUserStats: resolverErrorHandler(async (_, args) => {
            logger.info('getUserStats called', { userAddress: args.userAddress });
            
            const { userAddress } = args;
            
            if (!userAddress) {
                throw new ValidationError('User address is required');
            }

            const stats = await MailDataHelper.getUserStats(userAddress);
            return MailTransformHelper.transformUserStats(stats);
        }),

        searchMails: resolverErrorHandler(async (_, args) => {
            logger.info('searchMails called', args);
            
            const { searchParams, limit, offset } = args;
            
            return await MailDataHelper.searchMails(searchParams, { limit, offset });
        }),

        getConversationParticipants: resolverErrorHandler(async (_, args) => {
            logger.info('getConversationParticipants called', args);
            
            const { userAddress, limit } = args;
            
            if (!userAddress) {
                throw new ValidationError('User address is required');
            }

            return await MailDataHelper.getConversationParticipants(userAddress, limit);
        })
    },

    Mutation: {
        updateUserPreferences: resolverErrorHandler(async (_, args) => {
            logger.info('updateUserPreferences called');
            
            const { address, preferences } = args;
            
            return await UserPreferencesModel.upsert(address, preferences);
        }),

        bulkUpdateReadStatus: resolverErrorHandler(async (_, args) => {
            logger.info('bulkUpdateReadStatus called');
            
            const { mailIds, isRead, userAddress } = args;
            
            return await MailDataHelper.bulkUpdateReadStatus(mailIds, isRead, userAddress);
        }),

        markMailAsRead: resolverErrorHandler(async (_, args) => {
            logger.info('markMailAsRead called');
            
            const { mailId, userAddress } = args;
            
            // In a real implementation, this would update the read status
            // For now, just invalidate cache and return success
            await MailDataHelper.invalidateUserCache(userAddress);
            
            return true;
        }),

        updateMailLabel: resolverErrorHandler(async (_, args) => {
            logger.info('updateMailLabel called');
            
            const { mailId, userAddress, label } = args;
            
            // In a real implementation, this would update the label
            // For now, just invalidate cache and return success
            await MailDataHelper.invalidateUserCache(userAddress);
            
            return true;
        })
    }
};