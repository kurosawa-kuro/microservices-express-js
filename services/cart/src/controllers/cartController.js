const CartService = require('../services/cartService');

const cartService = new CartService();

module.exports = {
  addToCart: async (c, req, res, next) => {
    const { userId, productId, quantity } = c.request.requestBody;
    const cartItem = await cartService.addToCart(userId, productId, quantity);
    return res.status(201).json(cartItem);
  },

  removeFromCart: async (c, req, res, next) => {
    const { userId, cartItemId } = c.request.params;
    const result = await cartService.removeFromCart(userId, cartItemId);
    return res.status(200).json(result);
  },

  updateCartItem: async (c, req, res, next) => {
    const { userId, cartItemId } = c.request.params;
    const { quantity } = c.request.requestBody;
    const cartItem = await cartService.updateCartItem(userId, cartItemId, quantity);
    return res.status(200).json(cartItem);
  },

  getCart: async (c, req, res, next) => {
    const { userId } = c.request.params;
    const cart = await cartService.getCart(userId);
    return res.status(200).json(cart);
  },

  clearCart: async (c, req, res, next) => {
    const { userId } = c.request.params;
    const result = await cartService.clearCart(userId);
    return res.status(200).json(result);
  },

  syncCart: async (c, req, res, next) => {
    const { userId } = c.request.params;
    const result = await cartService.syncCartWithProducts(userId);
    return res.status(200).json(result);
  }
};
