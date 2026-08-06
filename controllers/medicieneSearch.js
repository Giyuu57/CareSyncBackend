import axios from 'axios';
import asyncHandler from 'express-async-handler';
import { Medication } from '../models/medicine.js'; // Your Mongoose model

// Get the API key from environment variables
const OPENFDA_API_KEY = process.env.OPENFDA_API_KEY || process.env.OPENFDA_KEY;

// 🟡 Main search: query from DB, fallback to OpenFDA
export const getMeds = asyncHandler(async (req, res) => {
  const query = req.query.query?.toLowerCase();
  const source = req.query.source?.toLowerCase() || 'any';
  const limit = parseInt(req.query.limit) || 10; // Default limit is 10
  const skip = parseInt(req.query.skip) || 0; // Default skip is 0

  if (!query) return res.status(400).json({ error: 'Query is required' });

  // Search in the database
  const dbResults = await getMedsFromDatabase(query, limit, skip);
  // 'careSync' is what the frontend sends for "search our local database only".
  // 'mediq' is kept for backward compatibility with any older callers.
  if (dbResults.length > 0 && (source === 'any' || source === 'caresync' || source === 'mediq')) {
    return res.json(dbResults);
  }

  // Search in OpenFDA
  if(source === 'any' || source === 'openfda') {
  const openFdaResults = await getMedsFromOpenFDA(query, limit, skip);
  return res.json(openFdaResults);
  }
  return res.status(404).json({ error: 'No results found' });
});

// 🟢 Search DB
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters
}

export const getMedsFromDatabase = async (query, limit, skip) => {
  const escapedQuery = escapeRegex(query); // Escape the query
  const meds = await Medication.find({
    $or: [
      { name: { $regex: `.*${escapedQuery}.*`, $options: 'i' } }, // Search in brand name
      { composition: { $regex: `.*${escapedQuery}.*`, $options: 'i' } }, // Search in generic name
    ],
  })
    .skip(skip)
    .limit(limit);

  return meds.map(med => ({
    id: med._id.toString(),
    name: med.name,
    manufacturer: med.manufacturer,
    composition: med.composition,
  }));
};

// 🔵 Search OpenFDA
export const getMedsFromOpenFDA = async (query, limit, skip) => {
  try {
    const response = await axios.get('https://api.fda.gov/drug/label.json', {
      params: {
        search: `openfda.brand_name:"${query}" OR openfda.generic_name:"${query}"`, // Search in both brand and generic names
        limit,
        skip,
        api_key: OPENFDA_API_KEY,
      },
    });

    const data = response.data.results
      .filter(item => item.openfda?.brand_name?.[0] || item.openfda?.generic_name?.[0])
      .map(item => ({
        id: `openfda-${item.id || item.set_id}`,
        name: item.openfda.brand_name?.[0] || item.openfda.generic_name?.[0], // Use brand name or generic name
        manufacturer: item.openfda.manufacturer_name?.[0] || 'Unknown',
      }));

    return data;
  } catch (err) {
    console.error('OpenFDA API error:', err.message);
    return [];
  }
};

// 🔴 Get med by ID (DB or OpenFDA)
export const getMedsFromId = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id.startsWith('openfda-')) {
    const result = await getMedsFromIdOpenFDA(id);
    return result ? res.json(result) : res.status(404).json({ error: 'OpenFDA med not found' });
  }

  const result = await getMedsFromIdDatabase(id);
  return result ? res.json(result) : res.status(404).json({ error: 'Medicine not found in database' });
});

// 🟢 Get by DB ID
export const getMedsFromIdDatabase = async (id) => {
  try {
    const med = await Medication.findById(id);
    if (!med) return null;
    return { id: med._id.toString(), name: med.name, composition: med.composition, manufacturer: med.manufacturer,  usage: med.usage, precautions: med.precautions };
  } catch {
    return null;
  }
};

// 🔵 Get by OpenFDA ID
export const getMedsFromIdOpenFDA = async (id) => {
  // Extract the numeric ID from the `openfda-{id}` format
  const openFdaId = id.split('openfda-')[1];
  try {
    // Fetch data from OpenFDA
    const response = await axios.get(`https://api.fda.gov/drug/label.json`, {
      params: {
        search: `(id:"${openFdaId}" OR set_id:"${openFdaId}")`, // Accept either OpenFDA identifier
        api_key: OPENFDA_API_KEY,
      },
    });

    const item = response.data.results[0]; // Get the first result
    if (!item) return null;

    // Return the formatted response
    return {
      id,
      name: item.openfda?.brand_name?.[0] || 'Unknown',
      manufacturer: item.openfda?.manufacturer_name?.[0] || 'Unknown',
      composition: item.openfda?.generic_name?.[0] || 'Unknown',
      usage: item.indications_and_usage?.[0] || 'No usage information available',
      precautions: item.warnings?.[0] || 'No precautions available',
      sideEffects: item.adverse_reactions?.[0] || 'No side effects available',
      storageInstructions: item.storage_and_handling?.[0] || 'No storage instructions available',
      activeIngredients: item.active_ingredient?.[0] || 'No active ingredients available',
      inactiveIngredients: item.inactive_ingredient?.[0] || 'No inactive ingredients available',
      dosageAndAdministration: item.dosage_and_administration?.[0] || 'No dosage information available',
      purpose: item.purpose?.[0] || 'No purpose information available',
      warnings: item.warnings?.[0] || 'No warnings available',
      askDoctor: item.ask_doctor?.[0] || 'No doctor consultation information available',
      stopUse: item.stop_use?.[0] || 'No stop use information available',
      pregnancyOrBreastFeeding: item.pregnancy_or_breast_feeding?.[0] || 'No pregnancy or breastfeeding information available',
      keepOutOfReachOfChildren: item.keep_out_of_reach_of_children?.[0] || 'No child safety information available',
      questions: item.questions?.[0] || 'No contact information available',
    };
  } catch (err) {
    console.error('OpenFDA API error:', err.message);
    return null;
  }
};

// 🟡 Get generic substitutes (same composition) from DB or OpenFDA
export const getMedsSubstitutes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  let composition = '';
  
  if (id.startsWith('openfda-')) {
    const med = await getMedsFromIdOpenFDA(id);
    if (med) {
      composition = med.composition;
    }
  } else {
    try {
      const med = await Medication.findById(id);
      if (med) {
        composition = med.composition;
      }
    } catch (err) {
      console.error('Error finding local medicine for substitutes:', err);
    }
  }

  if (!composition || composition.toLowerCase() === 'unknown') {
    return res.json([]);
  }

  // Clean and prepare composition for search
  const cleanComp = composition.split(',')[0].split(';')[0].trim();
  const escapedQuery = escapeRegex(cleanComp);
  
  // Find local substitutes excluding the current medicine
  const queryObj = {
    composition: { $regex: `.*${escapedQuery}.*`, $options: 'i' }
  };
  
  if (!id.startsWith('openfda-')) {
    queryObj._id = { $ne: id };
  }

  const dbSubstitutes = await Medication.find(queryObj).limit(5);

  let formatted = dbSubstitutes.map(med => ({
    id: med._id.toString(),
    name: med.name,
    manufacturer: med.manufacturer,
    composition: med.composition,
  }));

  // Supplement with OpenFDA if fewer than 3 local substitutes
  if (formatted.length < 3) {
    const fdaSubstitutes = await getMedsFromOpenFDA(cleanComp, 5, 0);
    const filteredFda = fdaSubstitutes
      .filter(item => item.id !== id && !formatted.some(f => f.name.toLowerCase() === item.name.toLowerCase()))
      .slice(0, 5 - formatted.length);
      
    formatted = [...formatted, ...filteredFda];
  }

  res.json(formatted);
});