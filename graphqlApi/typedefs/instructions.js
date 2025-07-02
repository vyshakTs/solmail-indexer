import gql from "graphql-tag";

export const instructionsTypeDefs = gql`
  # ================== INSTRUCTION TYPES ==================

  type CreatemailInstruction {
    id: String!
    trxHash: String!
    subject: String!
    fromAddress: String!
    toAddress: String!
    salt: String!
    iv: String!
    version: String!
    parentId: String
    acctMail: String!
    acctMailAccountV2: String!
    acctAuthority: String!
    acctSystemProgram: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type SendmailInstruction {
    id: String!
    trxHash: String!
    subject: String!
    body: String
    fromAddress: String!
    toAddress: String!
    salt: String!
    iv: String!
    version: String!
    acctMail: String!
    acctAuthority: String!
    acctSystemProgram: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type RegisterV2Instruction {
    id: String!
    trxHash: String!
    nostrKey: String!
    acctMailAccountV2: String!
    acctAuthority: String!
    acctSystemProgram: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type UpdateAccountV2Instruction {
    id: String!
    trxHash: String!
    nostrKey: String!
    mailbox: String!
    acctMailAccountV2: String!
    acctAuthority: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type UpdatemailInstruction {
    id: String!
    trxHash: String!
    body: String!
    acctMail: String!
    acctAuthority: String!
    acctSystemProgram: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type UpdatemailreadstatusInstruction {
    id: String!
    trxHash: String!
    acctMail: String!
    acctAuthority: String!
    acctSystemProgram: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type UpdatemaillabelInstruction {
    id: String!
    trxHash: String!
    label: String!
    acctMail: String!
    acctAuthority: String!
    acctSystemProgram: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type RegisterInstruction {
    id: String!
    trxHash: String!
    nostrKey: String!
    acctMailAccount: String!
    acctAuthority: String!
    acctSystemProgram: String!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  # ================== CONNECTION TYPES ==================

  type CreatemailInstructionConnection {
    instructions: [CreatemailInstruction!]!
    pagination: PaginationInfo!
  }

  type SendmailInstructionConnection {
    instructions: [SendmailInstruction!]!
    pagination: PaginationInfo!
  }

  type RegisterV2InstructionConnection {
    instructions: [RegisterV2Instruction!]!
    pagination: PaginationInfo!
  }

  type UpdateAccountV2InstructionConnection {
    instructions: [UpdateAccountV2Instruction!]!
    pagination: PaginationInfo!
  }

  type UpdatemailInstructionConnection {
    instructions: [UpdatemailInstruction!]!
    pagination: PaginationInfo!
  }

  type UpdatemailreadstatusInstructionConnection {
    instructions: [UpdatemailreadstatusInstruction!]!
    pagination: PaginationInfo!
  }

  type UpdatemaillabelInstructionConnection {
    instructions: [UpdatemaillabelInstruction!]!
    pagination: PaginationInfo!
  }

  type RegisterInstructionConnection {
    instructions: [RegisterInstruction!]!
    pagination: PaginationInfo!
  }

  # ================== QUERIES ==================

  extend type Query {
    # Get createmail instructions
    getCreatemailInstructions(
      limit: Int = 20
      offset: Int = 0
      fromAddress: String
      toAddress: String
    ): CreatemailInstructionConnection!

    # Get sendmail instructions
    getSendmailInstructions(
      limit: Int = 20
      offset: Int = 0
      fromAddress: String
      toAddress: String
    ): SendmailInstructionConnection!

    # Get register v2 instructions
    getRegisterV2Instructions(
      limit: Int = 20
      offset: Int = 0
    ): RegisterV2InstructionConnection!

    # Get update account v2 instructions
    getUpdateAccountV2Instructions(
      limit: Int = 20
      offset: Int = 0
    ): UpdateAccountV2InstructionConnection!

    # Get updatemail instructions
    getUpdatemailInstructions(
      limit: Int = 20
      offset: Int = 0
    ): UpdatemailInstructionConnection!

    # Get updatemailreadstatus instructions
    getUpdatemailreadstatusInstructions(
      limit: Int = 20
      offset: Int = 0
    ): UpdatemailreadstatusInstructionConnection!

    # Get updatemaillabel instructions
    getUpdatemaillabelInstructions(
      limit: Int = 20
      offset: Int = 0
    ): UpdatemaillabelInstructionConnection!

    # Get register instructions
    getRegisterInstructions(
      limit: Int = 20
      offset: Int = 0
    ): RegisterInstructionConnection!
  }
`;