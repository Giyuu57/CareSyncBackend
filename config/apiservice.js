import express, { json } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';

const app = express();
app.use(express.json());

// Free API configurations
const apis = {
  openFDA: async (query) => {
    try {
      const response = await axios.get(`https://api.fda.gov/drug/label.json`, {
        params: { search: `openfda.brand_name:"${query}"`, limit: 1 },
      });

      const data = response.data.results[0];
      return {
        name: data.openfda.brand_name ? data.openfda.brand_name[0] : query,
        description: data.description ? data.description[0] : 'No description available.',
        warnings: data.warnings ? data.warnings[0] : 'No warnings available.',
        source: 'openFDA',
      };
    } catch (error) {
      console.error('Error in openFDA:', error.message);
      throw new Error('openFDA API failed.');
    }
  },

  nlmHealthTopics: async (query) => {
    try {
      const response = await axios.get(
        `https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${encodeURIComponent(query)}`,
        { headers: { Accept: 'application/json' } }
      );

      const results = response.data.list && response.data.list.item ? response.data.list.item : [];
      const relevantResult = results.find((item) => item.title.toLowerCase().includes(query.toLowerCase()));

      return {
        name: query,
        description: relevantResult
          ? relevantResult.snippet
          : 'No health topic description available.',
        warnings: 'No warnings available for this health topic.',
        source: 'NLM Health Topics',
      };
    } catch (error) {
      console.error('Error in NLM Health Topics:', error.message);
      throw new Error('NLM Health Topics API failed.');
    }
  },
};

// Fetch and Save Medication Data
app.get('/medication/:name', async (req, res) => {
  const { name } = req.params;

  try {
    // Check MongoDB first
    let medication = await Medication.findOne({ name });
    if (medication) {
      return res.status(200).json(medication);
    }

    // Fetch data from APIs
    const results = await Promise.any(
      [apis.openFDA(name), apis.nlmHealthTopics(name)]
    );

    // Save to MongoDB
    medication = new Medication(results);
    await medication.save();

    res.status(200).json(medication);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Unable to fetch data from any APIs', error: error.message });
  }
});

// Update Medication Data
app.put('/medication/:name', async (req, res) => {
  const { name } = req.params;

  try {
    // Re-fetch data from APIs
    const results = await Promise.any(
      [apis.openFDA(name), apis.nlmHealthTopics(name)]
    );

    // Update MongoDB entry
    const medication = await Medication.findOneAndUpdate({ name }, results, { new: true, upsert: true });
    res.status(200).json(medication);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Unable to update medication data', error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));