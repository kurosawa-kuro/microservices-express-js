// Mock the shared Prisma client
jest.mock('../../../shared/database/prismaClient', () => ({
  getProductsClient: jest.fn(() => ({
    product: {},
    category: {}
  }))
}));

const ProductsService = require('../src/services/productsService');

describe('ProductsService', () => {
  let productsService;

  beforeEach(() => {
    productsService = new ProductsService();
  });

  it('should create an instance of ProductsService', () => {
    expect(productsService).toBeDefined();
    expect(productsService).toBeInstanceOf(ProductsService);
  });

  it('should have createProduct method', () => {
    expect(productsService.createProduct).toBeDefined();
    expect(typeof productsService.createProduct).toBe('function');
  });

  it('should have getProduct method', () => {
    expect(productsService.getProduct).toBeDefined();
    expect(typeof productsService.getProduct).toBe('function');
  });

  it('should have updateProduct method', () => {
    expect(productsService.updateProduct).toBeDefined();
    expect(typeof productsService.updateProduct).toBe('function');
  });

  it('should have deleteProduct method', () => {
    expect(productsService.deleteProduct).toBeDefined();
    expect(typeof productsService.deleteProduct).toBe('function');
  });

  it('should have searchProducts method', () => {
    expect(productsService.searchProducts).toBeDefined();
    expect(typeof productsService.searchProducts).toBe('function');
  });

  it('should have getCategories method', () => {
    expect(productsService.getCategories).toBeDefined();
    expect(typeof productsService.getCategories).toBe('function');
  });

  it('should have createCategory method', () => {
    expect(productsService.createCategory).toBeDefined();
    expect(typeof productsService.createCategory).toBe('function');
  });
});