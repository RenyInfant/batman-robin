const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Batman & Robin AI Prompt Competition Portal API',
      version: '1.0.0',
      description: 'Production-ready REST API for managing AI Prompt Engineering Competitions, user roles, image submissions, timers, real-time Socket.IO synchronization, and judge leaderboards.',
      contact: {
        name: 'Gotham Competition Tech Team'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Production Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { background-color: #0b0f19; } .swagger-ui { background-color: #121824; color: #fff; }',
    customSiteTitle: 'Batman & Robin Competition API Docs'
  }));
}

module.exports = setupSwagger;
