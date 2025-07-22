const CartService = require('../services/cartService');
const { createStandardError } = require('../../../../shared/middleware/errorHandler');
const logger = require('../../../../shared/utils/logger');

const cartService = new CartService();

module.exports = {
  addToCart: async (c, req, res) => {
    try {
      const { userId, productId, quantity } = c.request.requestBody;
      const cartItem = await cartService.addToCart(userId, productId, quantity);
      return res.status(201).json(cartItem);
    } catch (error) {
      logger.error('Error adding to cart:', { error: error.message, correlationId: req.correlationId });
      if (error.message === 'Product not found') {
        const errorResponse = createStandardError(404, 'PRODUCT_NOT_FOUND', 'Product not found', req.url);
        return res.status(404).json(errorResponse);
      }
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to add item to cart', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  removeFromCart: async (c, req, res) => {
    try {
      const { userId, cartItemId } = c.request.params;
      const result = await cartService.removeFromCart(userId, cartItemId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error removing from cart:', { error: error.message, correlationId: req.correlationId });
      if (error.message === 'Cart item not found') {
        const errorResponse = createStandardError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found', req.url);
        return res.status(404).json(errorResponse);
      }
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to remove item from cart', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  updateCartItem: async (c, req, res) => {
    try {
      const { userId, cartItemId } = c.request.params;
      const { quantity } = c.request.requestBody;
      const cartItem = await cartService.updateCartItem(userId, cartItemId, quantity);
      return res.status(200).json(cartItem);
    } catch (error) {
      logger.error('Error updating cart item:', { error: error.message, correlationId: req.correlationId });
      if (error.message === 'Cart item not found') {
        const errorResponse = createStandardError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found', req.url);
        return res.status(404).json(errorResponse);
      }
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to update cart item', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  getCart: async (c, req, res) => {
    try {
      const { userId } = c.request.params;
      const cart = await cartService.getCart(userId);
      return res.status(200).json(cart);
    } catch (error) {
      logger.error('Error fetching cart:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch cart', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  clearCart: async (c, req, res) => {
    try {
      const { userId } = c.request.params;
      const result = await cartService.clearCart(userId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error clearing cart:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to clear cart', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  syncCart: async (c, req, res) => {
    try {
      const { userId } = c.request.params;
      const result = await cartService.syncCartWithProducts(userId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error syncing cart:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to sync cart', req.url);
      return res.status(500).json(errorResponse);
    }
  }
};
