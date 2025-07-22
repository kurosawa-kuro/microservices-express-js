const { getUsersClient } = require('../../../../shared/database/prismaClient');
const axios = require('axios');
const logger = require('../../../../shared/utils/logger');

class UsersService {
  constructor() {
    this.prisma = getUsersClient();
  }

  async createUser(userDto) {
    const user = await this.prisma.user.create({
      data: {
        id: userDto.id,
        email: userDto.email,
        displayName: userDto.displayName,
        firstName: userDto.firstName,
        lastName: userDto.lastName,
        phoneNumber: userDto.phoneNumber,
        address: userDto.address,
        preferences: userDto.preferences,
        avatar: userDto.avatar
      }
    });

    return user;
  }

  async getUser(id) {
    return await this.prisma.user.findUnique({
      where: { id }
    });
  }

  async getUserByMobile(mobileNumber) {
    return await this.prisma.user.findFirst({
      where: { phoneNumber: mobileNumber }
    });
  }

  async updateUser(id, userDto) {
    return await this.prisma.user.update({
      where: { id },
      data: {
        email: userDto.email,
        displayName: userDto.displayName,
        firstName: userDto.firstName,
        lastName: userDto.lastName,
        phoneNumber: userDto.phoneNumber,
        address: userDto.address,
        preferences: userDto.preferences,
        avatar: userDto.avatar
      }
    });
  }

  async deleteUser(id) {
    await this.prisma.user.delete({
      where: { id }
    });
  }

  async getUserDetails(id, correlationId) {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error('User not found');
    }

    return { user };
  }
}

module.exports = UsersService;
