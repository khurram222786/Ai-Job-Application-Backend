const { Document } = require('../models');

module.exports = {

  async createDocument(documentData) {
    return await Document.create(documentData);
  },

  async updateDocument(document, updateData) {
    return await document.update(updateData);
  },

  async upsertDocument(userId, documentData) {
    const [document, created] = await Document.upsert({
      user_id: userId,
      ...documentData
    }, {
      returning: true
    });
    
    return { document, created };
  },
  async findDocumentByUserId(userId) {
    return await Document.findOne({
      where: { user_id: userId }
    });
  },

  async createOrUpdateDocument(userId, documentData) {
    // Find existing document
    const existingDoc = await Document.findOne({ where: { user_id: userId } });
    
    if (existingDoc) {
      // Update existing document
      return await existingDoc.update(documentData);
    }
    
    // Create new document if none exists
    return await Document.create(
        userId,
      ...documentData
    );
  }

};