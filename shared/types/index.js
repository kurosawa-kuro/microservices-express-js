const { z } = require('zod');

const ResponseDto = z.object({
  statusCode: z.string(),
  statusMsg: z.string()
});

const ErrorResponseDto = z.object({
  apiPath: z.string(),
  errorCode: z.string(),
  errorMessage: z.string(),
  errorTime: z.string()
});

const AccountsMsgDto = z.object({
  accountNumber: z.union([z.number(), z.bigint()]).transform(val => typeof val === 'bigint' ? Number(val) : val),
  name: z.string(),
  email: z.string().email(),
  mobileNumber: z.string().regex(/^[0-9]{10}$/)
});

const CustomerDto = z.object({
  name: z.string().min(5).max(30),
  email: z.string().email(),
  mobileNumber: z.string().regex(/^[0-9]{10}$/)
});

const AccountsDto = z.object({
  customerId: z.number(),
  accountNumber: z.union([z.number(), z.bigint()]).transform(val => typeof val === 'bigint' ? Number(val) : val),
  accountType: z.string(),
  branchAddress: z.string(),
  communicationSw: z.boolean().optional()
});

const CardsDto = z.object({
  mobileNumber: z.string().regex(/^[0-9]{10}$/),
  cardNumber: z.string(),
  cardType: z.string(),
  totalLimit: z.number(),
  amountUsed: z.number(),
  availableAmount: z.number()
});

const LoansDto = z.object({
  mobileNumber: z.string().regex(/^[0-9]{10}$/),
  loanNumber: z.string(),
  loanType: z.string(),
  totalLoan: z.number(),
  amountPaid: z.number(),
  outstandingAmount: z.number()
});

const CustomerDetailsDto = z.object({
  name: z.string().min(5).max(30),
  email: z.string().email(),
  mobileNumber: z.string().regex(/^[0-9]{10}$/),
  accountsDto: AccountsDto.optional(),
  cardsDto: CardsDto.optional(),
  loansDto: LoansDto.optional()
});

module.exports = {
  ResponseDto,
  ErrorResponseDto,
  AccountsMsgDto,
  CustomerDto,
  AccountsDto,
  CardsDto,
  LoansDto,
  CustomerDetailsDto
};
