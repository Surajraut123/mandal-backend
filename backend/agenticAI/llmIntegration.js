require('dotenv').config();
const axios = require('axios');


// Add this helper function before callGroq
function sanitizeAndParseJSON(jsonString) {
  try {
    // First attempt: direct parse
    return JSON.parse(jsonString);
  } catch (error) {
    console.log("Initial JSON parse failed, attempting to sanitize...");
    
    try {
      // Method 1: Remove extra characters after last valid }
      let cleaned = jsonString.trim();
      
      // Find the position where valid JSON should end
      let braceCount = 0;
      let endPos = -1;
      
      for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === '{') braceCount++;
        if (cleaned[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            endPos = i + 1;
            break;
          }
        }
      }
      
      if (endPos > 0) {
        cleaned = cleaned.substring(0, endPos);
        return JSON.parse(cleaned);
      }
      
      // Method 2: Try to fix common issues
      cleaned = jsonString
        .trim()
        .replace(/}\s*}+$/g, '}')  // Remove extra closing braces at end
        .replace(/,\s*}/g, '}')     // Remove trailing commas
        .replace(/,\s*]/g, ']');    // Remove trailing commas in arrays
      
      return JSON.parse(cleaned);
      
    } catch (secondError) {
      console.error("JSON sanitization failed:", secondError);
      console.error("Original string:", jsonString);
      
      // Last resort: try to extract JSON from text
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (matchError) {
          throw new Error(`Unable to parse JSON: ${jsonString}`);
        }
      }
      
      throw new Error(`Unable to parse JSON: ${jsonString}`);
    }
  }
}

// Update your callGroq function
async function callGroq(history) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'openai/gpt-oss-20b',
        messages: history,
        max_tokens: 900,
        temperature: 0,
        response_format: { type: "json_object" },
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiText = response.data.choices[0].message.content;
    
    console.log('AI Response:', aiText);
    console.log('Raw response data:', response.data.choices[0].message);

    // ✅ Use sanitization instead of direct parse
    const json = sanitizeAndParseJSON(aiText);

    return json;
    
  } catch (error) {
    console.error('Error calling Groq:', error.message);
    
    // Fallback response
    return {
      action: "NO_ACTION",
      data: {
        message: "I apologize, I encountered an error. Could you please rephrase your request?"
      }
    };
  }
}
module.exports = { callGroq };