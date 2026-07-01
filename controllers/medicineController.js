import  {Medication}  from '../models/medicine.js';
import asyncHandler from 'express-async-handler';

// @desc    Create a new medicine
// @route   POST /api/medicines
// @access  Public
export const createMedicine = asyncHandler(async (req, res) => {
  const medicineData = req.body;
  const medicine = new Medication(medicineData);
  const savedMedicine = await medicine.save();
  res.status(201).json(savedMedicine);
});

// @desc    Get all medicines
// @route   GET /api/medicines
// @access  Public
export const getMedicines = asyncHandler(async (req, res) => {
  const filter = req.query || {};
  const medicines = await Medication.find(filter);
  res.status(200).json(medicines);
});

// @desc    Get medicine by ID
// @route   GET /api/medicines/:id
// @access  Public
export const getMedicineById = asyncHandler(async (req, res) => {
  const medicine = await Medication.findById(req.params.id);
  if (!medicine) {
    res.status(404);
    throw new Error('Medicine not found');
  }
  res.status(200).json(medicine);
});

// @desc    Update a medicine by ID
// @route   PUT /api/medicines/:id
// @access  Public
export const updateMedicine = asyncHandler(async (req, res) => {
  const updatedMedicine = await Medication.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true, // Return the updated document
      runValidators: true, // Ensure validation
    }
  );
  if (!updatedMedicine) {
    res.status(404);
    throw new Error('Medicine not found');
  }
  res.status(200).json(updatedMedicine);
});

// @desc    Delete a medicine by ID
// @route   DELETE /api/medicines/:id
// @access  Public
export const deleteMedicine = asyncHandler(async (req, res) => {
  const deletedMedicine = await Medication.findByIdAndDelete(req.params.id);
  if (!deletedMedicine) {
    res.status(404);
    throw new Error('Medicine not found');
  }
  res.status(200).json({ message: 'Medicine deleted successfully' });
});


/* const getMediciene = asyncHandler(async (res , req) => {    
    const mediciene = await Medication.find({});
    res.json(mediciene);
});

const getMedicieneById = asyncHandler(async (res , req) => {
    const mediciene = await Medication.findById(req.params.id);
    if(mediciene){
        res.json(mediciene);
    }else{
        res.status(404).json({message: 'Mediciene not found'});
    }
});

const createMediciene = asyncHandler(async (res , req) => {
    const mediciene = new Medication({
        name: 'Sample name',
        dosage: 'Sample dosage',
        form: 'Sample form',
        indications: 'Sample indications',
        administrationRoute: 'Sample administration route',
        frequency: 'Sample frequency',
        startDate: new Date(),
        endDate: new Date(),
        sideEffects: ['Sample side effect'],
        contraindications: ['Sample contraindication'],
        precautions: ['Sample precaution'],
        storageInstructions: 'Sample storage instructions',
        prescribedBy: 'Sample doctor'
    });
    const createdMediciene = await mediciene.save();
    res.status(201).json(createdMediciene);
});

const updateMediciene = asyncHandler(async (res , req) => {
    const {name, dosage, form, indications, administrationRoute, frequency, startDate, endDate, sideEffects, contraindications, precautions, storageInstructions, prescribedBy} = req.body;
    const mediciene = await Medication.findById(req.params.id);
    if(mediciene){
        mediciene.name = name;
        mediciene.dosage = dosage;
        mediciene.form = form;
        mediciene.indications = indications;
        mediciene.administrationRoute = administrationRoute;
        mediciene.frequency = frequency;
        mediciene.startDate = startDate;
        mediciene.endDate = endDate;
        mediciene.sideEffects = sideEffects;
        mediciene.contraindications = contraindications;
        mediciene.precautions = precautions;
        mediciene.storageInstructions = storageInstructions;
        mediciene.prescribedBy = prescribedBy;

        const updatedMediciene = await mediciene.save();
        res.json(updatedMediciene);
    }else{
        res.status(404).json({message: 'Mediciene not found'});
    }
});

const deleteMediciene = asyncHandler(async (res , req) => {
    const mediciene = await Medication.findById(req.params.id);
    if(mediciene){
        await mediciene.remove();
        res.json({message: 'Mediciene removed'});
    }else{
        res.status(404).json({message: 'Mediciene not found'});
    }
}); */
