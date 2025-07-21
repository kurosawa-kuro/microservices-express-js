import { z } from 'zod';

// User schema
export const UserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Micropost schema
export const MicropostSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  userId: z.number().int().positive(),
  user: UserSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Create micropost request schema
export const CreateMicropostRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  userId: z.number().int().positive('User ID must be a positive integer')
});

// Response schemas
export const UsersResponseSchema = z.array(UserSchema);
export const MicropostsResponseSchema = z.array(MicropostSchema);

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional()
});