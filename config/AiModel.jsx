// const {
//     GoogleGenerativeAI,
//     HarmCategory,
//     HarmBlockThreshold,
//   } = require("@google/generative-ai");
//   const fs = require("node:fs");
//   const mime = require("mime-types");
  
//   const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
//   const genAI = new GoogleGenerativeAI(apiKey);
  
//   const model = genAI.getGenerativeModel({
//     model: "gemini-2.0-flash",
//   });
  
//   const generationConfig = {
//     temperature: 1,
//     topP: 0.95,
//     topK: 40,
//     maxOutputTokens: 8192,
//     responseModalities: [
//     ],
//     responseMimeType: "application/json",
//   };
  

//     export const GenerateTopicsAIModel = model.startChat({
//       generationConfig,
//       history: [
//         {
//           role: "user",
//           parts: [
//             {text: "Identify Various international Certifications for Personal Trainers :: As you are creating an application that provides mock tests for each of these.\n- user wants to add certifications\n- generate 5-7 certification titles\n- make sure it is related to description\n- output will be array of string in JSON format only\n- do not add any plain text in output\ngive me an object of only the certification titles"},
//           ],
//         },
//         {
//           role: "model",
//           parts: [
//             {text: "```json\n{\n  \"certifications\": [\n    \"NASM Certified Personal Trainer (NASM-CPT)\",\n    \"ACE Certified Personal Trainer (ACE-CPT)\",\n    \"ISSA Certified Personal Trainer (ISSA-CPT)\",\n    \"NSCA Certified Personal Trainer (NSCA-CPT)\",\n    \"NESTA Personal Fitness Trainer Certification (NESTA-PFT)\",\n    \"ACSM Certified Personal Trainer (ACSM-CPT)\",\n    \"CanFitPro Certified Personal Trainer (CanFitPro-CPT)\"\n  ]\n}\n```"},
//           ],
//         },
//       ],
//     });
  
//     const result = await chatSession.sendMessage("INSERT_INPUT_HERE");
//     // TODO: Following code needs to be updated for client-side apps.
//     const candidates = result.response.candidates;
//     for(let candidate_index = 0; candidate_index < candidates.length; candidate_index++) {
//       for(let part_index = 0; part_index < candidates[candidate_index].content.parts.length; part_index++) {
//         const part = candidates[candidate_index].content.parts[part_index];
//         if(part.inlineData) {
//           try {
//             const filename = `output_${candidate_index}_${part_index}.${mime.extension(part.inlineData.mimeType)}`;
//             fs.writeFileSync(filename, Buffer.from(part.inlineData.data, 'base64'));
//             console.log(`Output written to: ${filename}`);
//           } catch (err) {
//             console.error(err);
//           }
//         }
//       }
//     }
//     // console.log(result.response.text());
