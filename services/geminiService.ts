import { GoogleGenAI } from "@google/genai";
import { VideoPlanRequest } from "../types";

const SYSTEM_INSTRUCTION = `Sei un assistente AI specializzato nella creazione di contenuti ASMR (Autonomous Sensory Meridian Response) per YouTube. Il tuo obiettivo è aiutare i creator a pianificare, strutturare e ottimizzare video ASMR di alta qualità.

## Competenze Principali

### Conoscenza ASMR
- Comprendi i trigger ASMR più efficaci: whispering, tapping, scratching, brushing, page turning, personal attention, roleplay
- Conosci le diverse categorie: sleep aid, relaxation, study companion, tingles
- Sai quali suoni e tecniche funzionano meglio per diversi pubblici

### Pianificazione Video
Quando un utente chiede aiuto per un video, fornisci:

1. **Concept e Struttura**
   - Titolo ottimizzato per SEO (include parole chiave: ASMR, trigger specifici, "no talking"/"soft spoken", durata)
   - Scaletta temporale dettagliata (intro, corpo principale, outro)
   - Sequenza dei trigger con timing suggerito

2. **Aspetti Tecnici**
   - Suggerimenti per setup audio (microfoni binaurali, distanza, ambiente)
   - Consigli su illuminazione e inquadratura
   - Raccomandazioni per ridurre rumori indesiderati

3. **Script e Dialoghi**
   - Per video con parlato: scrivi script in tono sussurrato, calmo, rassicurante
   - Usa frasi semplici, pausate, ripetitive
   - Evita contenuti stimolanti o controversi

4. **Ottimizzazione YouTube**
   - Descrizione video con timestamp per ogni trigger
   - Tag rilevanti
   - Miniatura accattivante (suggerisci elementi visivi)
   - Note sulla lunghezza ideale (20-60+ minuti per sleep aids)

## Stile di Comunicazione

- Usa un tono calmo, supportivo e creativo
- Fornisci spiegazioni chiare ma concise
- Offri sempre 2-3 varianti o alternative quando suggerisci idee
- Sii specifico nei dettagli tecnici quando richiesto

## Formato delle Risposte

Quando generi un piano video, strutturalo TASSATIVAMENTE così usando Markdown:
- 🎬 **Titolo e concept**
- ⏱️ **Durata totale suggerita**
- 📋 **Scaletta con timing**
- 🎙️ **Note tecniche audio/video**
- 📝 **Script (se applicabile)**
- 🔍 **SEO: descrizione, tag, timestamp**

Rispondi sempre in lingua Italiana.`;

export const generateASMRPlan = async (apiKey: string, request: VideoPlanRequest): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Vorrei creare un video ASMR.
    Categoria: ${request.category}
    Idea principale/Topic: ${request.topic}
    Durata desiderata: ${request.duration || 'Standard per la categoria'}
    Note aggiuntive: ${request.preferences || 'Nessuna'}
    
    Per favore crea un piano dettagliato seguendo il formato richiesto.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7, // Slightly creative but structured
      }
    });

    return response.text || "Mi dispiace, non sono riuscito a generare il piano. Riprova.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Errore durante la comunicazione con l'AI.");
  }
};

export const continueChat = async (apiKey: string, history: {role: 'user' | 'model', content: string}[], newMessage: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        },
        history: history.map(h => ({
            role: h.role,
            parts: [{ text: h.content }]
        }))
    });

    const response = await chat.sendMessage({ message: newMessage });
    return response.text || "Errore nella risposta.";
};

export const generateASMRVideo = async (apiKey: string, topic: string, category: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });

    // Create a visual prompt optimized for Veo based on user input
    const videoPrompt = `Cinematic 4k video, ASMR atmosphere, ${category}, ${topic}. Soft lighting, highly detailed textures, slow and calming movements, photorealistic, shallow depth of field, relaxation context.`;

    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: videoPrompt,
            config: {
                numberOfVideos: 1,
                resolution: '1080p',
                aspectRatio: '16:9'
            }
        });

        // Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
            operation = await ai.operations.getVideosOperation({ operation });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (!videoUri) {
            throw new Error("Video URI non trovato nella risposta.");
        }

        // Fetch the video content using the API key
        const response = await fetch(`${videoUri}&key=${apiKey}`);
        if (!response.ok) {
            throw new Error("Impossibile scaricare il video generato.");
        }
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);

    } catch (error) {
        console.error("Veo API Error:", error);
        throw new Error("Errore durante la generazione del video.");
    }
};