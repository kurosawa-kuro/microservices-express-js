const { PrismaClient } = require('@prisma/client');
const { LoansDto } = require('../../../../shared/types');
const logger = require('../../../../shared/utils/logger');

class LoansService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async createLoan(mobileNumber) {
    try {
      const existingLoan = await this.prisma.loans.findFirst({
        where: { mobileNumber }
      });

      if (existingLoan) {
        throw new Error(`Loan already registered with given mobileNumber ${mobileNumber}`);
      }

      const loanNumber = this.generateRandomLoanNumber();

      const newLoan = await this.prisma.loans.create({
        data: {
          mobileNumber,
          loanNumber,
          loanType: 'Home Loan',
          totalLoan: 1000000,
          amountPaid: 0,
          outstandingAmount: 1000000,
          createdBy: 'system'
        }
      });

      logger.info(`Loan created successfully for mobile number: ${mobileNumber}`);
      return newLoan;
    } catch (error) {
      logger.error('Error creating loan:', error);
      throw error;
    }
  }

  async fetchLoan(mobileNumber) {
    try {
      const loan = await this.prisma.loans.findFirst({
        where: { mobileNumber }
      });

      if (!loan) {
        throw new Error(`Loan not found with given mobileNumber ${mobileNumber}`);
      }

      return this.mapToLoansDto(loan);
    } catch (error) {
      logger.error('Error fetching loan:', error);
      throw error;
    }
  }

  async updateLoan(loansDto) {
    try {
      const validatedData = LoansDto.parse(loansDto);
      
      const existingLoan = await this.prisma.loans.findFirst({
        where: { loanNumber: validatedData.loanNumber }
      });

      if (!existingLoan) {
        throw new Error(`Loan not found with given loanNumber ${validatedData.loanNumber}`);
      }

      const updatedLoan = await this.prisma.loans.update({
        where: { loanId: existingLoan.loanId },
        data: {
          loanType: validatedData.loanType,
          totalLoan: validatedData.totalLoan,
          amountPaid: validatedData.amountPaid,
          outstandingAmount: validatedData.outstandingAmount,
          updatedBy: 'system'
        }
      });

      logger.info(`Loan updated successfully: ${validatedData.loanNumber}`);
      return true;
    } catch (error) {
      logger.error('Error updating loan:', error);
      return false;
    }
  }

  async deleteLoan(mobileNumber) {
    try {
      const existingLoan = await this.prisma.loans.findFirst({
        where: { mobileNumber }
      });

      if (!existingLoan) {
        throw new Error(`Loan not found with given mobileNumber ${mobileNumber}`);
      }

      await this.prisma.loans.delete({
        where: { loanId: existingLoan.loanId }
      });

      logger.info(`Loan deleted successfully for mobile number: ${mobileNumber}`);
      return true;
    } catch (error) {
      logger.error('Error deleting loan:', error);
      return false;
    }
  }

  generateRandomLoanNumber() {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
  }

  mapToLoansDto(loan) {
    return {
      mobileNumber: loan.mobileNumber,
      loanNumber: loan.loanNumber,
      loanType: loan.loanType,
      totalLoan: loan.totalLoan,
      amountPaid: loan.amountPaid,
      outstandingAmount: loan.outstandingAmount
    };
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = LoansService;
