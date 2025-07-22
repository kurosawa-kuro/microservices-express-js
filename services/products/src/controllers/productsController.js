const ProductsService = require('../services/productsService');

const productsService = new ProductsService();

module.exports = {
  createProduct: async (c, req, res, next) => {
    const productDto = c.request.requestBody;
    const product = await productsService.createProduct(productDto);
    return res.status(201).json(product);
  },

  getProduct: async (c, req, res, next) => {
    const { id } = c.request.params;
    const product = await productsService.getProduct(id);
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    return res.status(200).json(product);
  },

  updateProduct: async (c, req, res, next) => {
    const { id } = c.request.params;
    const productDto = c.request.requestBody;
    const product = await productsService.updateProduct(id, productDto);
    return res.status(200).json(product);
  },

  deleteProduct: async (c, req, res, next) => {
    const { id } = c.request.params;
    await productsService.deleteProduct(id);
    return res.status(200).json({
      message: 'Product deleted successfully'
    });
  },

  searchProducts: async (c, req, res, next) => {
    const searchParams = c.request.query;
    const result = await productsService.searchProducts(searchParams);
    return res.status(200).json(result);
  },

  getCategories: async (c, req, res, next) => {
    const categories = await productsService.getCategories();
    return res.status(200).json(categories);
  },

  createCategory: async (c, req, res, next) => {
    const categoryDto = c.request.requestBody;
    const category = await productsService.createCategory(categoryDto);
    return res.status(201).json(category);
  }
};
