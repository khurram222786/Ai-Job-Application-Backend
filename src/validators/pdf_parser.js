const fetch = require('node-fetch');
const pdf = require('pdf-parse');
const documentRepository = require('../repositories/documentRepository');

function sanitizeResumeText(text) {
  return text
    .replace(/<script.*?>.*?<\/script>/gi, '')  
    .replace(/<\/?[^>]+(>|$)/g, '')            
    .replace(/[^\w\s.,\-@()/]/g, '')           
    .replace(/\s+/g, ' ')                      
    .trim();
}

async function parseResume(userId) {
  try {
    const resumeDoc = await documentRepository.findDocumentByUserId(userId);
    if (!resumeDoc) {
      throw new Error(`No resume found for user ID: ${userId}`);
    }

    const resumeUrl = resumeDoc.file_url;

    const response = await fetch(resumeUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch resume from Cloudinary. Status: ${response.status}`);
    }

    const pdfBuffer = await response.buffer();
    const data = await pdf(pdfBuffer);

    const cleanText = sanitizeResumeText(data.text); // 🔐 Sanitize here

    return cleanText;
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw error;
  }
}

module.exports = parseResume;
