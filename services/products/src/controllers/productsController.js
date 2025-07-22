const ProductsService = require('../services/productsService');
const { createStandardError } = require('../../../../shared/middleware/errorHandler');
const logger = require('../../../../shared/utils/logger');

const productsService = new ProductsService();

module.exports = {
  createProduct: async (c, req, res) => {
    try {
      const productDto = c.request.requestBody;
      const product = await productsService.createProduct(productDto);
      return res.status(201).json(product);
    } catch (error) {
      logger.error('Error creating product:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create product', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  getProduct: async (c, req, res) => {
    try {
      const { id } = c.request.params;
      const product = await productsService.getProduct(id);
      if (!product) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }
      return res.status(200).json(product);
    } catch (error) {
      logger.error('Error fetching product:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch product', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  updateProduct: async (c, req, res) => {
    try {
      const { id } = c.request.params;
      const productDto = c.request.requestBody;
      const product = await productsService.updateProduct(id, productDto);
      return res.status(200).json(product);
    } catch (error) {
      logger.error('Error updating product:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to update product', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  deleteProduct: async (c, req, res) => {
    try {
      const { id } = c.request.params;
      await productsService.deleteProduct(id);
      return res.status(200).json({
        message: 'Product deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting product:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to delete product', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  searchProducts: async (c, req, res) => {
    try {
      const searchParams = c.request.query;
      const result = await productsService.searchProducts(searchParams);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error searching products:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to search products', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  getCategories: async (c, req, res) => {
    try {
      const categories = await productsService.getCategories();
      return res.status(200).json(categories);
    } catch (error) {
      logger.error('Error fetching categories:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch categories', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  createCategory: async (c, req, res) => {
    try {
      const categoryDto = c.request.requestBody;
      const category = await productsService.createCategory(categoryDto);
      return res.status(201).json(category);
    } catch (error) {
      logger.error('Error creating category:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create category', req.url);
      return res.status(500).json(errorResponse);
    }
  }
};
