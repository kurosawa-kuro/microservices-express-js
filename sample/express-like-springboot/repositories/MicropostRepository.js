export class MicropostRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAll() {
    return await this.prisma.micropost.findMany({
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findById(id) {
    return await this.prisma.micropost.findUnique({
      where: { id },
      include: {
        user: true
      }
    });
  }

  async create(data) {
    return await this.prisma.micropost.create({
      data,
      include: {
        user: true
      }
    });
  }
}