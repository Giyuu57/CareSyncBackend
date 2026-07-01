import mongoose from 'mongoose';

const run = async () => {
    try {
        await mongoose.connect(process.env.uri);
        mongoose.connection.useDb('MediQ')
        console.log('Connected to database');
    } catch (error) {
        console.error('Not connected to database:',error);
    }
};

export { run };