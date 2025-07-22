const { getProductsClient } = require('../../../../shared/database/prismaClient');
const logger = require('../../../../shared/utils/logger');

class ProductsService {
  constructor() {
    this.prisma = getProductsClient();
  }

  async createProduct(productData) {
    try {
      const product = await this.prisma.product.create({
        data: {
          name: productData.name,
          price: productData.price,
          rating: productData.rating || 0,
          image: productData.image,
          description: productData.description,
          productCategories: productData.categoryIds ? {
            create: productData.categoryIds.map(categoryId => ({
              categoryId: categoryId
            }))
          } : undefined
        },
        include: {
          productCategories: {
            include: {
              category: true
            }
          }
        }
      });
      
      logger.info('Product created successfully', { productId: product.id });
      return product;
    } catch (error) {
      logger.error('Error creating product:', { error: error.message });
      throw error;
    }
  }

  async getProduct(id) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: parseInt(id) },
        include: {
          productCategories: {
            include: {
              category: true
            }
          }
        }
      });
      
      if (product) {
        logger.info('Product retrieved successfully', { productId: id });
      }
      return product;
    } catch (error) {
      logger.error('Error retrieving product:', { error: error.message, productId: id });
      throw error;
    }
  }

  async updateProduct(id, productData) {
    try {
      const product = await this.prisma.product.update({
        where: { id: parseInt(id) },
        data: {
          name: productData.name,
          price: productData.price,
          rating: productData.rating,
          image: productData.image,
          description: productData.description
        },
        include: {
          productCategories: {
            include: {
              category: true
            }
          }
        }
      });
      
      logger.info('Product updated successfully', { productId: id });
      return product;
    } catch (error) {
      logger.error('Error updating product:', { error: error.message, productId: id });
      throw error;
    }
  }

  async deleteProduct(id) {
    try {
      await this.prisma.product.delete({
        where: { id: parseInt(id) }
      });
      
      logger.info('Product deleted successfully', { productId: id });
      return { message: 'Product deleted successfully' };
    } catch (error) {
      logger.error('Error deleting product:', { error: error.message, productId: id });
      throw error;
    }
  }

  async searchProducts(searchParams) {
    try {
      const { name, categoryId, minPrice, maxPrice, page = 1, limit = 10 } = searchParams;
      const skip = (page - 1) * limit;
      
      const where = {};
      
      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive'
        };
      }
      
      if (categoryId) {
        where.productCategories = {
          some: {
            categoryId: parseInt(categoryId)
          }
        };
      }
      
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice);
        if (maxPrice) where.price.lte = parseFloat(maxPrice);
      }
      
      const products = await this.prisma.product.findMany({
        where,
        include: {
          productCategories: {
            include: {
              category: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      });
      
      const total = await this.prisma.product.count({ where });
      
      logger.info('Products searched successfully', { 
        count: products.length, 
        total, 
        searchParams 
      });
      
      return {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching products:', { error: error.message, searchParams });
      throw error;
    }
  }

  async getCategories() {
    try {
      const categories = await this.prisma.category.findMany({
        orderBy: { name: 'asc' }
      });
      
      logger.info('Categories retrieved successfully', { count: categories.length });
      return categories;
    } catch (error) {
      logger.error('Error retrieving categories:', { error: error.message });
      throw error;
    }
  }

  async createCategory(categoryData) {
    try {
      const category = await this.prisma.category.create({
        data: {
          name: categoryData.name
        }
      });
      
      logger.info('Category created successfully', { categoryId: category.id });
      return category;
    } catch (error) {
      logger.error('Error creating category:', { error: error.message });
      throw error;
    }
  }
}

module.exports = ProductsService;
