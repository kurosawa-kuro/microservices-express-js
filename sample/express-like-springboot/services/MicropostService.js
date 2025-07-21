export class MicropostService {
  constructor(micropostRepository, userRepository) {
    this.micropostRepository = micropostRepository;
    this.userRepository = userRepository;
  }

  async findAllMicroposts() {
    return await this.micropostRepository.findAll();
  }

  async findMicropostById(id) {
    return await this.micropostRepository.findById(id);
  }

  async createMicropost({ title, userId }) {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return await this.micropostRepository.create({ title, userId });
  }
}