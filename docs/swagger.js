const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Management System API',
      version: '1.0.0',
      description:
        'Complete API documentation for the QR-Based Event Management System with guest registration, check-in, and reporting.',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: `${config.backendUrl}/api`,
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            avatar: { type: 'string' },
            role: { type: 'string', enum: ['Admin', 'Event Staff'] },
            authProvider: { type: 'string', enum: ['local', 'google'] },
          },
        },
        Event: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            venue: { type: 'string' },
            eventDate: { type: 'string', format: 'date-time' },
            eventTime: { type: 'string' },
            organizerName: { type: 'string' },
            organizerEmail: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          },
        },
        Attendee: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            fullName: { type: 'string' },
            email: { type: 'string' },
            mobile: { type: 'string' },
            company: { type: 'string' },
            invitationStatus: { type: 'string', enum: ['Invited', 'Registered', 'Cancelled'] },
            registrationStatus: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] },
            attendanceStatus: { type: 'string', enum: ['not_checked_in', 'checked_in'] },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
