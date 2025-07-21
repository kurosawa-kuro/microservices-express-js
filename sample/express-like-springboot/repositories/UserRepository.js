export class UserRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAll() {
    return await this.prisma.user.findMany({
      include: {
        microposts: true
      }
    });
  }

  async findById(id) {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        microposts: true
      }
    });
  }

  async create(data) {
    return await this.prisma.user.create({
      data,
      include: {
        microposts: true
      }
    });
  }
}