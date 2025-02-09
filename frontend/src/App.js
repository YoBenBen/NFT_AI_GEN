import React, { useState } from "react";


function App() {
 // State variables for prompt, images, loading status, error message,
 // NFT name, and NFT description.
 const [prompt, setPrompt] = useState("");
 const [generatedImages, setGeneratedImages] = useState([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");
 const [nftName, setNftName] = useState("");
 const [nftDescription, setNftDescription] = useState("");


 // Function to call backend /generate endpoint using the prompt
 const generateImages = async () => {
   setLoading(true); // Turn on loading indicator
   setError(""); // Clear any previous error messages
   setGeneratedImages([]); // Clear previous images


   try {
     // Send POST request to the backend with the prompt in the request body
     const response = await fetch("http://localhost:8000/generate", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ prompt }),
     });


     const data = await response.json();
     console.log("Received generated image from API."); // Log confirmation


     // If no images are returned, set error message
     if (!data || !data.images) {
       setError("No images returned from API.");
       setGeneratedImages([]);
       return;
     }


     // Save the returned images in state
     setGeneratedImages(data.images);
   } catch (error) {
     console.error("Error fetching images:", error);
     setError("Failed to fetch images. Please try again.");
   } finally {
     setLoading(false); // Turn off loading indicator
   }


   // Display NFT form controls only if images have been generated
   if (generatedImages.length > 0) {
     document.getElementById("hiddenButton").style.display = "inline";
     document.getElementById("inputNameNFT").style.display = "block";
     document.getElementById("inputDescriptionNFT").style.display = "block";
   }
 };


 // Function to call backend /makeNFT endpoint to create NFT metadata
 const makeNFT = async () => {
   console.log("makeNFT called");
   // Get the NFT name and description from the input elements
   const nameValue = document.getElementById("inputNameNFT").value;
   const descriptionValue = document.getElementById("inputDescriptionNFT").value;
  
   // Disable buttons while processing
   document.getElementById("generateImages").disabled = true;
   document.getElementById("hiddenButton").disabled = true;


   // If either field is empty, show a warning and do not proceed
   if (nameValue === "" || descriptionValue === "") {
     document.getElementById("warning").style.display = "block";
     return;
   } else {
     document.getElementById("warning").style.display = "none";
   }


   try {
     // Use the first generated image (Base64 string) for simplicity
     const base64Image = generatedImages[0];


     // Prepare the metadata payload for the backend
     const metadata = {
       name: nameValue,
       description: descriptionValue,
       imageBase64: base64Image,
     };


     // Send POST request to the backend /makeNFT endpoint with the metadata
     const response = await fetch("http://localhost:8000/makeNFT", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(metadata),
     });


     const data = await response.json();
     if (data.success) {
       alert("NFT Metadata successfully created!");


       // Display the returned Image CID and Metadata CID using Pinata gateway links
       document.getElementById("cidDisplay").innerHTML = `
 <p>Image CID: ${data.imageCid}</p>
 <a href="https://gateway.pinata.cloud/ipfs/${data.imageCid.replace('ipfs://', '')}" target="_blank">Link to NFT Image</a>
 <p>Metadata CID: ${data.metadataUrl.replace('ipfs://', '')}</p>
 <a href="https://gateway.pinata.cloud/ipfs/${data.metadataUrl.replace('ipfs://', '')}" target="_blank">Link to NFT Metadata</a>
`;
       // Reset NFT name and description fields
       setNftName("");
       setNftDescription("");
     } else {
       alert("Failed to create NFT. Check console for details.");
       console.error(data.error);
     }
   } catch (error) {
     console.error("Error uploading NFT metadata:", error);
   }
 };


 return (
   <div style={{ textAlign: "center", padding: "20px" }}>
     <h1>AI NFT Generator</h1>


     {/* Input field for prompt */}
     <input
       type="text"
       value={prompt}
       onChange={(e) => setPrompt(e.target.value)}
       placeholder="Enter a prompt..."
       style={{ padding: "10px", width: "80%", maxWidth: "400px" }}
     />
     <br />


     {/* Button to generate images */}
     <button
       id="generateImages"
       onClick={generateImages}
       disabled={loading}
       style={{
         marginTop: "10px",
         padding: "10px 20px",
         cursor: "pointer",
         backgroundColor: loading ? "#ccc" : "#007bff",
         color: "#fff",
         border: "none",
         borderRadius: "5px",
       }}
     >
       {loading ? "Generating..." : "Generate"}
     </button>


     {/* Display error message if there is an error */}
     {error && <p style={{ color: "red" }}>{error}</p>}


     {/* Display generated images */}
     <div style={{ marginTop: "20px" }}>
       {generatedImages.length > 0 ? (
         generatedImages.map((imgUrl, index) => (
           <img
             key={index}
             src={`data:image/png;base64,${imgUrl}`}
             alt={`Generated ${index + 1}`}
             style={{
               width: "300px",
               height: "300px",
               margin: "10px",
               borderRadius: "10px",
             }}
           />
         ))
       ) : (
         !loading && <p>No images generated yet.</p>
       )}
     </div>


     {/* Button to create NFT metadata */}
     <button
       id="hiddenButton"
       onClick={makeNFT}
       style={{
         display: generatedImages.length > 0 ? "block" : "none",
         margin: "10px auto", // Centers the button horizontally
         padding: "10px 20px",
         cursor: "pointer",
         color: "#fff",
         border: "none",
         borderRadius: "5px",
         background: "red",
       }}
     >
       Make this image an NFT
     </button>


     {/* Input field for NFT name */}
     <input
       id="inputNameNFT"
       type="text"
       placeholder="Put NFT Name Here"
       style={{
         display: generatedImages.length > 0 ? "inline" : "none",
         marginLeft: "10px",
         padding: "10px",
         width: "80%",
         maxWidth: "400px",
       }}
     />


     {/* Input field for NFT description */}
     <input
       id="inputDescriptionNFT"
       type="text"
       placeholder="Put NFT Description Here"
       style={{
         display: generatedImages.length > 0 ? "inline" : "none",
         marginLeft: "10px",
         padding: "10px",
         width: "80%",
         maxWidth: "400px",
       }}
     />


     {/* Warning message if NFT name or description is missing */}
     <p id="warning" style={{ display: "none" }}>
       Name and Description must be filled!
     </p>


     {/* Div to display CID information from the backend */}
     <div id="cidDisplay"></div>
   </div>
 );
}


export default App;
