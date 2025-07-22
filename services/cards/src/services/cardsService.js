const { PrismaClient } = require('@prisma/client');
const { CardsDto } = require('../../shared/types');
const logger = require('../../shared/utils/logger');

class CardsService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async createCard(mobileNumber) {
    try {
      const existingCard = await this.prisma.cards.findFirst({
        where: { mobileNumber }
      });

      if (existingCard) {
        throw new Error(`Card already registered with given mobileNumber ${mobileNumber}`);
      }

      const cardNumber = this.generateRandomCardNumber();

      const newCard = await this.prisma.cards.create({
        data: {
          mobileNumber,
          cardNumber,
          cardType: 'Credit Card',
          totalLimit: 100000,
          amountUsed: 0,
          availableAmount: 100000,
          createdBy: 'system'
        }
      });

      logger.info(`Card created successfully for mobile number: ${mobileNumber}`);
      return newCard;
    } catch (error) {
      logger.error('Error creating card:', error);
      throw error;
    }
  }

  async fetchCard(mobileNumber) {
    try {
      const card = await this.prisma.cards.findFirst({
        where: { mobileNumber }
      });

      if (!card) {
        throw new Error(`Card not found with given mobileNumber ${mobileNumber}`);
      }

      return this.mapToCardsDto(card);
    } catch (error) {
      logger.error('Error fetching card:', error);
      throw error;
    }
  }

  async updateCard(cardsDto) {
    try {
      const validatedData = CardsDto.parse(cardsDto);
      
      const existingCard = await this.prisma.cards.findFirst({
        where: { cardNumber: validatedData.cardNumber }
      });

      if (!existingCard) {
        throw new Error(`Card not found with given cardNumber ${validatedData.cardNumber}`);
      }

      const updatedCard = await this.prisma.cards.update({
        where: { cardId: existingCard.cardId },
        data: {
          cardType: validatedData.cardType,
          totalLimit: validatedData.totalLimit,
          amountUsed: validatedData.amountUsed,
          availableAmount: validatedData.availableAmount,
          updatedBy: 'system'
        }
      });

      logger.info(`Card updated successfully: ${validatedData.cardNumber}`);
      return true;
    } catch (error) {
      logger.error('Error updating card:', error);
      return false;
    }
  }

  async deleteCard(mobileNumber) {
    try {
      const existingCard = await this.prisma.cards.findFirst({
        where: { mobileNumber }
      });

      if (!existingCard) {
        throw new Error(`Card not found with given mobileNumber ${mobileNumber}`);
      }

      await this.prisma.cards.delete({
        where: { cardId: existingCard.cardId }
      });

      logger.info(`Card deleted successfully for mobile number: ${mobileNumber}`);
      return true;
    } catch (error) {
      logger.error('Error deleting card:', error);
      return false;
    }
  }

  generateRandomCardNumber() {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
  }

  mapToCardsDto(card) {
    return {
      mobileNumber: card.mobileNumber,
      cardNumber: card.cardNumber,
      cardType: card.cardType,
      totalLimit: card.totalLimit,
      amountUsed: card.amountUsed,
      availableAmount: card.availableAmount
    };
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = CardsService;
