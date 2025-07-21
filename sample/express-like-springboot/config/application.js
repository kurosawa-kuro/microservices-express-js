import { UserRepository } from '../repositories/UserRepository.js';
import { MicropostRepository } from '../repositories/MicropostRepository.js';
import { UserService } from '../services/UserService.js';
import { MicropostService } from '../services/MicropostService.js';
import { UserController } from '../controllers/UserController.js';
import { MicropostController } from '../controllers/MicropostController.js';
import { getDatabaseClient } from './database.js';

export class ApplicationContext {
  constructor() {
    this.prisma = getDatabaseClient();
    this.userRepository = new UserRepository(this.prisma);
    this.micropostRepository = new MicropostRepository(this.prisma);
    this.userService = new UserService(this.userRepository);
    this.micropostService = new MicropostService(this.micropostRepository, this.userRepository);
    this.userController = new UserController(this.userService);
    this.micropostController = new MicropostController(this.micropostService);
  }

  getHandlers() {
    return {
      getUsers: (c, req, res) => this.userController.getUsers(c, req, res),
      getMicroposts: (c, req, res) => this.micropostController.getMicroposts(c, req, res),
      getMicropostById: (c, req, res) => this.micropostController.getMicropostById(c, req, res),
      createMicropost: (c, req, res) => this.micropostController.createMicropost(c, req, res)
    };
  }
}