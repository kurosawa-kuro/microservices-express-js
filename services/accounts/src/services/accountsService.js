const { PrismaClient } = require('@prisma/client');
const { CustomerDto } = require('../../shared/types');
const EventPublisherService = require('./eventPublisherService');
const logger = require('../../shared/utils/logger');

class AccountsService {
  constructor() {
    this.prisma = new PrismaClient();
    this.eventPublisher = process.env.NODE_ENV === 'test' ? null : new EventPublisherService();
  }

  async createAccount(customerDto) {
    try {
      const validatedData = CustomerDto.parse(customerDto);
      
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { mobileNumber: validatedData.mobileNumber }
      });

      if (existingCustomer) {
        throw new Error(`Customer already registered with given mobileNumber ${validatedData.mobileNumber}`);
      }

      const accountNumber = this.generateRandomAccountNumber();

      const result = await this.prisma.$transaction(async (prisma) => {
        const customer = await prisma.customer.create({
          data: {
            name: validatedData.name,
            email: validatedData.email,
            mobileNumber: validatedData.mobileNumber,
            createdBy: 'system'
          }
        });

        const account = await prisma.accounts.create({
          data: {
            customerId: customer.customerId,
            accountNumber,
            accountType: 'Savings',
            branchAddress: '123 Main Street, New York',
            communicationSw: true,
            createdBy: 'system'
          }
        });

        return { customer, account };
      });

      if (this.eventPublisher) {
        await this.eventPublisher.publishAccountCreatedEvent({
          accountNumber: result.account.accountNumber,
          name: result.customer.name,
          email: result.customer.email,
          mobileNumber: result.customer.mobileNumber
        });
      }

      logger.info(`Account created successfully for mobile number: ${validatedData.mobileNumber}`);
      return result;
    } catch (error) {
      logger.error('Error creating account:', error);
      throw error;
    }
  }

  async fetchAccount(mobileNumber) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { mobileNumber },
        include: { accounts: true }
      });

      if (!customer) {
        throw new Error(`Customer not found with given mobileNumber ${mobileNumber}`);
      }

      return this.mapToCustomerDto(customer);
    } catch (error) {
      logger.error('Error fetching account:', error);
      throw error;
    }
  }

  async updateAccount(customerDto) {
    try {
      const validatedData = CustomerDto.parse(customerDto);
      
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { mobileNumber: validatedData.mobileNumber }
      });

      if (!existingCustomer) {
        throw new Error(`Customer not found with given mobileNumber ${validatedData.mobileNumber}`);
      }

      const updatedCustomer = await this.prisma.customer.update({
        where: { customerId: existingCustomer.customerId },
        data: {
          name: validatedData.name,
          email: validatedData.email,
          updatedBy: 'system'
        }
      });

      logger.info(`Account updated successfully for mobile number: ${validatedData.mobileNumber}`);
      return true;
    } catch (error) {
      logger.error('Error updating account:', error);
      return false;
    }
  }

  async deleteAccount(mobileNumber) {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { mobileNumber }
      });

      if (!existingCustomer) {
        throw new Error(`Customer not found with given mobileNumber ${mobileNumber}`);
      }

      await this.prisma.customer.delete({
        where: { customerId: existingCustomer.customerId }
      });

      logger.info(`Account deleted successfully for mobile number: ${mobileNumber}`);
      return true;
    } catch (error) {
      logger.error('Error deleting account:', error);
      return false;
    }
  }

  generateRandomAccountNumber() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  mapToCustomerDto(customer) {
    return {
      name: customer.name,
      email: customer.email,
      mobileNumber: customer.mobileNumber
    };
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = AccountsService;
