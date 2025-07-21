import { CreateMicropostRequestSchema, MicropostsResponseSchema, MicropostSchema } from '../schemas/zod.js';
import { validateResponse } from '../middleware/validation.js';

export class MicropostController {
  constructor(micropostService) {
    this.micropostService = micropostService;
  }

  async getMicroposts(c, req, res) {
    try {
      const microposts = await this.micropostService.findAllMicroposts();
      const validatedMicroposts = validateResponse(MicropostsResponseSchema)(microposts);
      return res.json(validatedMicroposts);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getMicropostById(c, req, res) {
    try {
      const { id } = c.request.params;
      const micropost = await this.micropostService.findMicropostById(parseInt(id));
      
      if (!micropost) {
        return res.status(404).json({ error: 'Micropost not found' });
      }
      
      const validatedMicropost = validateResponse(MicropostSchema)(micropost);
      return res.json(validatedMicropost);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async createMicropost(c, req, res) {
    try {
      const validatedRequest = CreateMicropostRequestSchema.parse(c.request.requestBody);
      const micropost = await this.micropostService.createMicropost(validatedRequest);
      const validatedMicropost = validateResponse(MicropostSchema)(micropost);
      return res.status(201).json(validatedMicropost);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      if (error.message === 'User not found') {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message });
    }
  }
}