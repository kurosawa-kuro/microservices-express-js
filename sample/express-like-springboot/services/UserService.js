export class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async findAllUsers() {
    return await this.userRepository.findAll();
  }

  async findUserById(id) {
    return await this.userRepository.findById(id);
  }
}