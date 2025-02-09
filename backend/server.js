// Load environment variables from the .env file
require("dotenv").config();


// Import required modules
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");


// Initialize Express app
const app = express();


// Allow large JSON payloads (e.g., for large Base64 image strings)
app.use(express.json({ limit: "50mb" }));
// Enable CORS to allow cross-origin requests from your frontend
app.use(cors());


// (Optional) Serve local files if needed – not required once you fully migrate to IPFS.
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ------------------------------------------
// Endpoint: /generate
// Calls Stability AI to generate an image based on a prompt.
// ------------------------------------------
const API_KEY = process.env.AI_API_KEY; // Get Stability AI API key from environment
app.post("/generate", async (req, res) => {
 try {
   // Extract the prompt from the request body
   const { prompt } = req.body;


   // Create a FormData instance and append required fields
   const formData = new FormData();
   formData.append("prompt", prompt);
   formData.append("output_format", "png");


   // Make a POST request to Stability AI's endpoint with the form data
   const response = await axios.post(
     "https://api.stability.ai/v2beta/stable-image/generate/core",
     formData,
     {
       headers: {
         ...formData.getHeaders(),
         Authorization: `Bearer ${API_KEY}`, // Set the authorization header
       },
     }
   );


   // Check if a valid image was returned
   if (!response.data || !response.data.image) {
     console.error("❌ Error: No image received from Stability AI");
     return res.status(500).json({ error: "No image returned from Stability AI" });
   }


   // Log confirmation and send the image data as JSON
   console.log("✅ Generated image received from Stability AI.");
   res.json({ images: [response.data.image] });
 } catch (error) {
   // Log and return any errors from the API request
   console.error(
     "🚨 API Error:",
     error.response ? JSON.stringify(error.response.data, null, 2) : error.message
   );
   res.status(500).json({
     error: "Error generating image",
     details: error.response ? error.response.data : error.message,
   });
 }
});


// ------------------------------------------
// Endpoint: /makeNFT
// Receives the NFT name, description, and Base64 image,
// uploads the image to Pinata, constructs metadata JSON,
// uploads the metadata to Pinata, and returns the metadata IPFS link.
// ------------------------------------------
app.post("/makeNFT", async (req, res) => {
 try {
   // Extract NFT name, description, and image (Base64) from request body
   const { name, description, imageBase64 } = req.body;


   // Remove any data URL prefix from the Base64 string (if present)
   const base64String = imageBase64.replace(/^data:image\/\w+;base64,/, "");
   // Convert the cleaned Base64 string into a binary Buffer
   const imgBuffer = Buffer.from(base64String, "base64");


   // Get Pinata API credentials from environment variables
   const pinataApiKey = process.env.PINATA_API_KEY;
   const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
   if (!pinataApiKey || !pinataSecretApiKey) {
     throw new Error("Pinata API credentials are not set in environment variables.");
   }


   // 1. Upload the image to Pinata using pinFileToIPFS
const imageFormData = new FormData();
// Append the image file to the form data (naming it "nftImage.png")
imageFormData.append("file", imgBuffer, "nftImage.png");

// Use form-data's built-in header generation so that the boundary is correct.
const pinataHeaders = imageFormData.getHeaders();
pinataHeaders.pinata_api_key = pinataApiKey;
pinataHeaders.pinata_secret_api_key = pinataSecretApiKey;

const pinataRes = await axios.post(
  "https://api.pinata.cloud/pinning/pinFileToIPFS",
  imageFormData,
  {
    maxBodyLength: "Infinity", // Prevent issues with large files
    headers: pinataHeaders,
  }
);

   // Retrieve the image CID (Content Identifier) from Pinata's response
   const imageIpfsHash = pinataRes.data.IpfsHash;
   console.log("✅ Image CID:", imageIpfsHash);


   // 2. Build NFT metadata using the provided name, description, and image CID
   const nftMetadata = {
     name,
     description,
     image: `ipfs://${imageIpfsHash}`,
   };
   console.log("Pinata response for image upload: ✅", imageIpfsHash);


   // 3. Upload the metadata JSON to Pinata using pinJSONToIPFS
   const pinJSONRes = await axios.post(
     "https://api.pinata.cloud/pinning/pinJSONToIPFS",
     nftMetadata,
     {
       headers: {
         pinata_api_key: pinataApiKey,
         pinata_secret_api_key: pinataSecretApiKey,
       },
     }
   );


   // Retrieve the metadata CID from the response
   const metadataIpfsHash = pinJSONRes.data.IpfsHash;
   console.log("✅ Metadata CID:", metadataIpfsHash);


   // Save the metadata CID to a variable (CIV) for later use in CSV
   const CIV = metadataIpfsHash;


   // 4. Generate a random token ID and create a CSV output
   const tokenID = Math.floor(Math.random() * 1000) + 1; // Random tokenID between 1 and 1000
   const fileName = `${tokenID}.png`; // Create a file name based on the tokenID


   // Construct CSV with header and a single row of values
   const CSV = `tokenID,name,description,file_name,metadata_CID\n${tokenID},"${name}","${description}",${fileName},${CIV}`;
   console.log("✅ CSV Output:\n", CSV);


   // 5. Return the metadata IPFS link and CSV to the client
   res.json({
     success: true,
     ipfsHash: CIV, // Metadata CID
     imageCid: `ipfs://${imageIpfsHash}`, // Image CID
     metadataUrl: `ipfs://${CIV}`, // Metadata URL (same as ipfsHash here)
     csv: CSV,
   });
 } catch (error) {
   // Log and return any errors encountered during the process
   console.error(
     "Error creating NFT via Pinata:",
     error.response ? error.response.data : error.message
   );
   res.status(500).json({ success: false, error: error.message });
 }
});


// ------------------------------------------
// Start the server on port 8000
// ------------------------------------------
app.listen(8000, () => console.log("✅ Server running on port 8000"));


