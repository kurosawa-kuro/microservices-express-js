const { getCartClient } = require('../../../../shared/database/prismaClient');
const logger = require('../../../../shared/utils/logger');
const axios = require('axios');

class CartService {
  constructor() {
    this.prisma = getCartClient();
    this.productsServiceUrl = process.env.PRODUCTS_SERVICE_URL || 'http://products-service:8083';
  }

  async addToCart(userId, productId, quantity = 1) {
    try {
      const productInfo = await this.getProductInfo(productId);
      if (!productInfo) {
        throw new Error('Product not found');
      }

      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          userId: userId,
          productId: parseInt(productId)
        }
      });

      let cartItem;
      if (existingItem) {
        cartItem = await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + parseInt(quantity),
            productName: productInfo.name,
            productPrice: productInfo.price,
            productImage: productInfo.image
          }
        });
      } else {
        cartItem = await this.prisma.cartItem.create({
          data: {
            userId: userId,
            productId: parseInt(productId),
            quantity: parseInt(quantity),
            productName: productInfo.name,
            productPrice: productInfo.price,
            productImage: productInfo.image
          }
        });
      }

      logger.info('Item added to cart successfully', { 
        userId, 
        productId, 
        quantity, 
        cartItemId: cartItem.id 
      });
      return cartItem;
    } catch (error) {
      logger.error('Error adding item to cart:', { error: error.message, userId, productId });
      throw error;
    }
  }

  async removeFromCart(userId, cartItemId) {
    try {
      const cartItem = await this.prisma.cartItem.findFirst({
        where: {
          id: parseInt(cartItemId),
          userId: userId
        }
      });

      if (!cartItem) {
        throw new Error('Cart item not found');
      }

      await this.prisma.cartItem.delete({
        where: { id: parseInt(cartItemId) }
      });

      logger.info('Item removed from cart successfully', { userId, cartItemId });
      return { message: 'Item removed from cart successfully' };
    } catch (error) {
      logger.error('Error removing item from cart:', { error: error.message, userId, cartItemId });
      throw error;
    }
  }

  async updateCartItem(userId, cartItemId, quantity) {
    try {
      const cartItem = await this.prisma.cartItem.findFirst({
        where: {
          id: parseInt(cartItemId),
          userId: userId
        }
      });

      if (!cartItem) {
        throw new Error('Cart item not found');
      }

      if (parseInt(quantity) <= 0) {
        return await this.removeFromCart(userId, cartItemId);
      }

      const updatedItem = await this.prisma.cartItem.update({
        where: { id: parseInt(cartItemId) },
        data: { quantity: parseInt(quantity) }
      });

      logger.info('Cart item updated successfully', { userId, cartItemId, quantity });
      return updatedItem;
    } catch (error) {
      logger.error('Error updating cart item:', { error: error.message, userId, cartItemId });
      throw error;
    }
  }

  async getCart(userId) {
    try {
      const cartItems = await this.prisma.cartItem.findMany({
        where: { userId: userId },
        orderBy: { addedAt: 'desc' }
      });

      const totalAmount = cartItems.reduce((sum, item) => {
        return sum + (item.productPrice * item.quantity);
      }, 0);

      const totalItems = cartItems.reduce((sum, item) => {
        return sum + item.quantity;
      }, 0);

      logger.info('Cart retrieved successfully', { 
        userId, 
        itemCount: cartItems.length, 
        totalAmount 
      });

      return {
        items: cartItems,
        summary: {
          totalItems,
          totalAmount,
          itemCount: cartItems.length
        }
      };
    } catch (error) {
      logger.error('Error retrieving cart:', { error: error.message, userId });
      throw error;
    }
  }

  async clearCart(userId) {
    try {
      const deletedCount = await this.prisma.cartItem.deleteMany({
        where: { userId: userId }
      });

      logger.info('Cart cleared successfully', { userId, deletedCount: deletedCount.count });
      return { message: 'Cart cleared successfully', deletedCount: deletedCount.count };
    } catch (error) {
      logger.error('Error clearing cart:', { error: error.message, userId });
      throw error;
    }
  }

  async syncCartWithProducts(userId) {
    try {
      const cartItems = await this.prisma.cartItem.findMany({
        where: { userId: userId }
      });

      for (const item of cartItems) {
        try {
          const productInfo = await this.getProductInfo(item.productId);
          if (productInfo) {
            await this.prisma.cartItem.update({
              where: { id: item.id },
              data: {
                productName: productInfo.name,
                productPrice: productInfo.price,
                productImage: productInfo.image
              }
            });
          }
        } catch (productError) {
          logger.warn('Failed to sync product info for cart item', { 
            cartItemId: item.id, 
            productId: item.productId,
            error: productError.message 
          });
        }
      }

      logger.info('Cart synced with products successfully', { userId });
      return { message: 'Cart synced successfully' };
    } catch (error) {
      logger.error('Error syncing cart with products:', { error: error.message, userId });
      throw error;
    }
  }

  async getProductInfo(productId) {
    try {
      const response = await axios.get(`${this.productsServiceUrl}/api/products/${productId}`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching product info:', { 
        error: error.message, 
        productId, 
        serviceUrl: this.productsServiceUrl 
      });
      return null;
    }
  }
}

module.exports = CartService;
