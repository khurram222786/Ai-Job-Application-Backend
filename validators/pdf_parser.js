// parseResume.js
const fetch = require('node-fetch');
const pdf = require('pdf-parse');
const documentRepository = require('../repositories/documentRepository'); // adjust path as needed

async function parseResume(userId) {
  try {
    // 1. Fetch resume link from the DB
    const resumeDoc = await documentRepository.findDocumentByUserId(userId);
    if (!resumeDoc) {
      throw new Error(`No resume found for user ID: ${userId}`);
    }

    console.log("test--->",resumeDoc.file_url)

    const resumeUrl = resumeDoc.file_url;

    // 2. Download PDF from Cloudinary
    const response = await fetch(resumeUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch resume from Cloudinary. Status: ${response.status}`);
    }

    const pdfBuffer = await response.buffer();

    // 3. Parse PDF content
    const data = await pdf(pdfBuffer);

    // 4. Return extracted text
    return data.text;
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw error;
  }
}

module.exports = parseResume;
