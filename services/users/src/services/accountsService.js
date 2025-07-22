const { getUsersClient } = require('../../../../shared/database/prismaClient');
const logger = require('../../../../shared/utils/logger');

class AccountsService {
  constructor() {
    this.prisma = getUsersClient();
  }

  async createAccount(accountDto) {
    const account = await this.prisma.account.create({
      data: {
        userId: accountDto.userId,
        accountNumber: BigInt(accountDto.accountNumber),
        accountType: accountDto.accountType,
        branchAddress: accountDto.branchAddress,
        communicationSw: accountDto.communicationSw || false,
        createdBy: accountDto.createdBy
      }
    });

    return {
      ...account,
      accountNumber: account.accountNumber.toString()
    };
  }

  async getAccountByMobile(mobileNumber) {
    const user = await this.prisma.user.findFirst({
      where: { phoneNumber: mobileNumber }
    });

    if (!user) {
      return null;
    }

    const accounts = await this.prisma.account.findMany({
      where: { userId: user.id }
    });

    return {
      user,
      accounts: accounts.map(account => ({
        ...account,
        accountNumber: account.accountNumber.toString()
      }))
    };
  }

  async updateAccount(accountDto) {
    const account = await this.prisma.account.update({
      where: { accountNumber: BigInt(accountDto.accountNumber) },
      data: {
        accountType: accountDto.accountType,
        branchAddress: accountDto.branchAddress,
        communicationSw: accountDto.communicationSw,
        updatedBy: accountDto.updatedBy
      }
    });

    return {
      ...account,
      accountNumber: account.accountNumber.toString()
    };
  }

  async deleteAccount(mobileNumber) {
    const user = await this.prisma.user.findFirst({
      where: { phoneNumber: mobileNumber }
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.prisma.account.deleteMany({
      where: { userId: user.id }
    });
  }
}

module.exports = AccountsService;
