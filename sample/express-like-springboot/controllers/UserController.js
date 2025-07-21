import { UsersResponseSchema } from '../schemas/zod.js';
import { validateResponse } from '../middleware/validation.js';

export class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  async getUsers(c, req, res) {
    try {
      const users = await this.userService.findAllUsers();
      const validatedUsers = validateResponse(UsersResponseSchema)(users);
      return res.json(validatedUsers);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}