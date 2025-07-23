// Mock the shared Prisma client
jest.mock('../../../shared/database/prismaClient', () => ({
  getCartClient: jest.fn(() => ({
    cartItem: {}
  }))
}));

const CartService = require('../src/services/cartService');

describe('CartService', () => {
  let cartService;

  beforeEach(() => {
    cartService = new CartService();
  });

  it('should create an instance of CartService', () => {
    expect(cartService).toBeDefined();
    expect(cartService).toBeInstanceOf(CartService);
  });

  it('should have addToCart method', () => {
    expect(cartService.addToCart).toBeDefined();
    expect(typeof cartService.addToCart).toBe('function');
  });

  it('should have removeFromCart method', () => {
    expect(cartService.removeFromCart).toBeDefined();
    expect(typeof cartService.removeFromCart).toBe('function');
  });

  it('should have updateCartItem method', () => {
    expect(cartService.updateCartItem).toBeDefined();
    expect(typeof cartService.updateCartItem).toBe('function');
  });

  it('should have getCart method', () => {
    expect(cartService.getCart).toBeDefined();
    expect(typeof cartService.getCart).toBe('function');
  });

  it('should have clearCart method', () => {
    expect(cartService.clearCart).toBeDefined();
    expect(typeof cartService.clearCart).toBe('function');
  });

  it('should have syncCartWithProducts method', () => {
    expect(cartService.syncCartWithProducts).toBeDefined();
    expect(typeof cartService.syncCartWithProducts).toBe('function');
  });

  it('should have getProductInfo method', () => {
    expect(cartService.getProductInfo).toBeDefined();
    expect(typeof cartService.getProductInfo).toBe('function');
  });
});