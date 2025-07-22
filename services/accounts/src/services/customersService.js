const { PrismaClient } = require('@prisma/client');
const CardsRestClient = require('./client/cardsRestClient');
const LoansRestClient = require('./client/loansRestClient');
const logger = require('../../shared/utils/logger');

class CustomersService {
  constructor() {
    this.prisma = new PrismaClient();
    this.cardsClient = new CardsRestClient();
    this.loansClient = new LoansRestClient();
  }

  async fetchCustomerDetails(mobileNumber, correlationId) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { mobileNumber },
        include: { accounts: true }
      });

      if (!customer) {
        throw new Error(`Customer not found with given mobileNumber ${mobileNumber}`);
      }

      const customerDetailsDto = {
        name: customer.name,
        email: customer.email,
        mobileNumber: customer.mobileNumber
      };

      if (customer.accounts && customer.accounts.length > 0) {
        const account = customer.accounts[0]; // Assuming one account per customer
        customerDetailsDto.accountsDto = {
          customerId: account.customerId,
          accountNumber: account.accountNumber,
          accountType: account.accountType,
          branchAddress: account.branchAddress,
          communicationSw: account.communicationSw
        };
      }

      try {
        const cardsDto = await this.cardsClient.fetchCard(mobileNumber, correlationId);
        customerDetailsDto.cardsDto = cardsDto;
      } catch (error) {
        logger.warn(`Cards not found for mobile number ${mobileNumber}:`, error.message);
        customerDetailsDto.cardsDto = null;
      }

      try {
        const loansDto = await this.loansClient.fetchLoan(mobileNumber, correlationId);
        customerDetailsDto.loansDto = loansDto;
      } catch (error) {
        logger.warn(`Loans not found for mobile number ${mobileNumber}:`, error.message);
        customerDetailsDto.loansDto = null;
      }

      logger.info(`Customer details fetched successfully for mobile number: ${mobileNumber}`);
      return customerDetailsDto;
    } catch (error) {
      logger.error('Error fetching customer details:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = CustomersService;
