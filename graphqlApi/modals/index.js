// Mail Event modals
export {
    MailSendEventModel,
    MailV2SendEventModel,
    MailV2UpdateEventModel,
    MailV2ReadEventModel,
    MailV2UpdateLabelEventModel
} from './mailEvents.js';

// Account Event modals
export {
    MailAccountV2RegisterEventModel,
    MailAccountV2UpdateEventModel,
    AnalyticsModel
} from './accountEvents.js';

// Instruction modals
export {
    CreatemailInstructionModel,
    SendmailInstructionModel,
    RegisterV2InstructionModel,
    UpdateAccountV2InstructionModel,
    UpdatemailInstructionModel,
    UpdatemailreadstatusInstructionModel,
    UpdatemaillabelInstructionModel,
    RegisterInstructionModel
} from './instructions.js';

// User modals
export { UserPreferencesModel, UserStatsModel } from './userModels.js';

// Database utilities
export { query, transaction, dbHealthCheck } from '../core/index.js';
