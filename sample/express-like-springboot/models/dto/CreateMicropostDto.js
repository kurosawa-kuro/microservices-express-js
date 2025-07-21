export class CreateMicropostDto {
  constructor(title, userId) {
    this.title = title;
    this.userId = userId;
  }

  validate() {
    if (!this.title || typeof this.title !== 'string' || this.title.trim() === '') {
      throw new Error('Title is required and must be a non-empty string');
    }
    if (!this.userId || typeof this.userId !== 'number' || this.userId <= 0) {
      throw new Error('Valid userId is required');
    }
  }
}