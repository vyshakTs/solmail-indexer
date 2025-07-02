import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language/index.js';
import { logger } from '../core/index.js';

// Custom scalar types
const DateTimeScalar = new GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    serialize(value) {
        // Handle null/undefined
        if (value === null || value === undefined) {
            return null;
        }

        // If already a valid Date
        if (value instanceof Date) {
            // Check if date is valid
            if (isNaN(value.getTime())) {
                logger.warn('Invalid Date object encountered in DateTime serialization', { value });
                return null;
            }
            return value.toISOString();
        }

        // Handle string/number values
        if (typeof value === 'string' || typeof value === 'number') {
            const date = new Date(value);
            
            // Check if the resulting date is valid
            if (isNaN(date.getTime())) {
                logger.warn('Invalid date value encountered in DateTime serialization', { 
                    value, 
                    type: typeof value 
                });
                return null;
            }
            
            return date.toISOString();
        }

        // Handle unexpected types
        logger.warn('Unexpected value type in DateTime serialization', { 
            value, 
            type: typeof value 
        });
        return null;
    },
    parseValue(value) {
        if (!value) return null;
        
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date value: ${value}`);
        }
        return date;
    },
    parseLiteral(ast) {
        if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
            const date = new Date(ast.value);
            if (isNaN(date.getTime())) {
                throw new Error(`Invalid date literal: ${ast.value}`);
            }
            return date;
        }
        return null;
    },
});

const BigIntScalar = new GraphQLScalarType({
    name: 'BigInt',
    description: 'BigInt custom scalar type',
    serialize(value) {
        return value.toString();
    },
    parseValue(value) {
        return BigInt(value);
    },
    parseLiteral(ast) {
        if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
            return BigInt(ast.value);
        }
        return null;
    },
});

export const baseResolvers = {
    // Custom scalars
    DateTime: DateTimeScalar,
    BigInt: BigIntScalar,

    // Common field resolvers that can be reused
    AddressStats: {
        displayAddress: (parent) => {
            return parent.address && parent.address.length > 12 
                ? `${parent.address.substring(0, 6)}...${parent.address.substring(parent.address.length - 4)}`
                : parent.address;
        }
    },

    NetworkNode: {
        degree: (parent) => {
            return parent.incomingConnections + parent.outgoingConnections;
        }
    },

    UserStats: {
        readPercentage: (parent) => {
            if (parent.totalMailsReceived === 0) return 0;
            return ((parent.totalMailsRead / parent.totalMailsReceived) * 100).toFixed(2);
        },

        totalActivity: (parent) => {
            return parent.totalMailsSent + parent.totalMailsReceived;
        }
    },

    Mail: {
        direction: (parent, args, context) => {
            // Determine mail direction based on context user
            const userAddress = context.user?.address || context.req?.headers?.['x-user-address'];
            if (!userAddress) return null;
            
            if (parent.fromAddress === userAddress) return 'OUTGOING';
            if (parent.toAddress === userAddress) return 'INCOMING';
            return null;
        }
    }
};