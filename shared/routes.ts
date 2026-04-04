import { z } from 'zod';
import { insertMonitorSchema, monitors, items, messages } from './schema';

export const         errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  monitors: {
    list: {
      method: 'GET' as const,
      path: '/api/monitors' as const,
      responses: {
        200: z.array(z.custom<typeof monitors.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/monitors/:id' as const,
      responses: {
        200: z.custom<typeof monitors.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/monitors' as const,
      input: insertMonitorSchema,
      responses: {
        201: z.custom<typeof monitors.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/monitors/:id' as const,
      input: insertMonitorSchema.partial(),
      responses: {
        200: z.custom<typeof monitors.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/monitors/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  items: {
    list: {
      method: 'GET' as const,
      path: '/api/items' as const,
      input: z.object({
        monitorId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof items.$inferSelect>()),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/items/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  jobs: {
    triggerCheck: {
      method: 'POST' as const,
      path: '/api/jobs/check' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    }
  },
  ai: {
    chat: {
      method: 'POST' as const,
      path: '/api/ai/chat' as const,
      input: z.object({ message: z.string() }),
      responses: {
        200: z.object({ response: z.string() }),
      }
    },
    messages: {
      method: 'GET' as const,
      path: '/api/ai/messages' as const,
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type MonitorInput = z.infer<typeof api.monitors.create.input>;
export type MonitorUpdateInput = z.infer<typeof api.monitors.update.input>;
export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
export type InternalError = z.infer<typeof errorSchemas.internal>;
