const logger = require('../../../../shared/utils/logger');
const { AccountsMsgDto } = require('../../../../shared/types');

class MessageService {
  
  async processEmail(accountsMsgData) {
    try {
      const validatedData = AccountsMsgDto.parse(accountsMsgData);
      logger.info(`Sending email with the details: ${JSON.stringify(validatedData)}`);
      
      await this.simulateEmailSending(validatedData);
      
      return validatedData;
    } catch (error) {
      logger.error('Error processing email:', error);
      throw error;
    }
  }

  async processSms(accountsMsgData) {
    try {
      const validatedData = AccountsMsgDto.parse(accountsMsgData);
      logger.info(`Sending SMS with the details: ${JSON.stringify(validatedData)}`);
      
      await this.simulateSmsSending(validatedData);
      
      return validatedData.accountNumber;
    } catch (error) {
      logger.error('Error processing SMS:', error);
      throw error;
    }
  }

  async simulateEmailSending(accountData) {
    await new Promise(resolve => setTimeout(resolve, 100));
    logger.info(`Email sent to ${accountData.email} for account ${accountData.accountNumber}`);
  }

  async simulateSmsSending(accountData) {
    await new Promise(resolve => setTimeout(resolve, 50));
    logger.info(`SMS sent to ${accountData.mobileNumber} for account ${accountData.accountNumber}`);
  }
}

module.exports = MessageService;
