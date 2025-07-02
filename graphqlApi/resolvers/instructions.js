import {
    CreatemailInstructionModel,
    SendmailInstructionModel,
    RegisterV2InstructionModel,
    UpdateAccountV2InstructionModel,
    UpdatemailInstructionModel,
    UpdatemailreadstatusInstructionModel,
    UpdatemaillabelInstructionModel,
    RegisterInstructionModel
} from '../modals/index.js';
import { logger, resolverErrorHandler } from '../core/index.js';


export const instructionsResolvers = {
    Query: {
        getCreatemailInstructions: resolverErrorHandler(async (_, args) => {
            logger.info('getCreatemailInstructions called', args);
            
            const { limit, offset, fromAddress, toAddress } = args;
            const filters = {};
            if (fromAddress) filters.from_address = fromAddress;
            if (toAddress) filters.to_address = toAddress;

            const instructions = await CreatemailInstructionModel.findAll(filters, { limit, offset });
            const total = await CreatemailInstructionModel.count(filters);

            return {
                instructions,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };
        }),

        getSendmailInstructions: resolverErrorHandler(async (_, args) => {
            logger.info('getSendmailInstructions called', args);
            
            const { limit, offset, fromAddress, toAddress } = args;
            const filters = {};
            if (fromAddress) filters.from_address = fromAddress;
            if (toAddress) filters.to_address = toAddress;

            const instructions = await SendmailInstructionModel.findAll(filters, { limit, offset });
            const total = await SendmailInstructionModel.count(filters);

            return {
                instructions,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };
        }),

        getRegisterV2Instructions: resolverErrorHandler(async (_, args) => {
            logger.info('getRegisterV2Instructions called', args);
            
            const { limit, offset } = args;
            const instructions = await RegisterV2InstructionModel.findAll({}, { limit, offset });
            const total = await RegisterV2InstructionModel.count({});

            return {
                instructions,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };
        }),

        getUpdateAccountV2Instructions: resolverErrorHandler(async (_, args) => {
            logger.info('getUpdateAccountV2Instructions called', args);
            
            const { limit, offset } = args;
            const instructions = await UpdateAccountV2InstructionModel.findAll({}, { limit, offset });
            const total = await UpdateAccountV2InstructionModel.count({});

            return {
                instructions,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };
        }),

        getUpdatemailInstructions: resolverErrorHandler(async (_, args) => {
            logger.info('getUpdatemailInstructions called', args);
            
            const { limit, offset } = args;
            const instructions = await UpdatemailInstructionModel.findAll({}, { limit, offset });
            const total = await UpdatemailInstructionModel.count({});

            return {
                instructions,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };
        }),

        getUpdatemailreadstatusInstructions: resolverErrorHandler(async (_, args) => {
            logger.info('getUpdatemailreadstatusInstructions called', args);
            
            const { limit, offset } = args;
            const instructions = await UpdatemailreadstatusInstructionModel.findAll({}, { limit, offset });
            const total = await UpdatemailreadstatusInstructionModel.count({});

            return {
                instructions,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };
        }),

        getUpdatemaillabelInstructions: resolverErrorHandler(async (_, args) => {
            logger.info('getUpdatemaillabelInstructions called', args);
            
            const { limit, offset } = args;
            const instructions = await UpdatemaillabelInstructionModel.findAll({}, { limit, offset });
            const total = await UpdatemaillabelInstructionModel.count({});

            return {
                instructions,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasNext: offset + limit < total,
                    hasPrev: offset > 0
                }
            };
        }),

        getRegisterInstructions: resolverErrorHandler(async (_, args) => {
            logger.info('getRegisterInstructions called', args);
            
            const { limit, offset } = args;
            const instructions = await RegisterInstructionModel.findAll({}, { limit, offset });
            const total = await RegisterInstructionModel.count({});

            return {
                instructions,
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